import { CodecExtApi, CodecLongApi, NewableType } from "./codec_api";
import { Decoder } from "./Decoder";
import { Encoder } from "./Encoder";
import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

//bigint(or not safe Integer)
export class CodecLong implements CodecLongApi {
    public isImp(v: any) {
        return typeof (v) == "bigint";
    }
    // public isVal(v) {
    //     return typeof (v) == "bigint" || (Number.isInteger(v) && !Number.isSafeInteger(v));
    // }
    public toAuto(v: any) {
        let n = Number(v);
        if (Number.isSafeInteger(n)) {
            return n;
        }
        return v;
    }
    public encode(v: any, out: OutStream): OutStream {
        v = BigInt(v);
        if (v < 0) {
            out.u8(0xd3).i64(v);
        } else {
            out.u8(0xcf).u64(v);
        }
        return out;
    }
    public decodeNegative(ins: InStream): any {
        return ins.i64();
    }
    public decodePositive(ins: InStream): any {
        return ins.u64();
    }
}

//date codec
export class CodecExtDate implements CodecExtApi {
    public static INSTANCE = new CodecExtDate();

    get TYPE(): number {
        return 255;
    }
    get CLASS(): NewableType {
        return Date;
    }
    public encode(d: Date, out: OutStream, encoder: any) {
        var millis = d.getTime(),//d * 1
            seconds = Math.floor(millis / 1000),
            nanos = (millis - seconds * 1000) * 1e6;
        if (nanos || seconds > 0xffffffff) {// Timestamp64
            var upperNanos = nanos * 4,
                upperSeconds = seconds / Math.pow(2, 32),
                upper = (upperNanos + upperSeconds) & 0xffffffff,
                lower = seconds & 0xffffffff;
            return out.bu(0xd7, 255).i32(upper).i32(lower);
        } else {// Timestamp32
            return out.bu(0xd6, 255).i32(Math.floor(millis / 1000));
        }
    }
    public decode(ins: InStream, decoder: any) {
        switch (ins.size) {
            case 4:
                // timestamp 32 stores the number of seconds that have elapsed since 1970-01-01 00:00:00 UTC in an 32-bit unsigned integer
                return new Date(ins.u32() * 1000);
            case 8:
                // Timestamp 64 stores the number of seconds and nanoseconds that have elapsed
                // since 1970-01-01 00:00:00 UTC in 32-bit unsigned integers, split 30/34 bits
                let upper = ins.u32(),
                    lower = ins.u32(),
                    nanoseconds = upper / 4,
                    seconds = ((upper & 0x03) * Math.pow(2, 32)) + lower // If we use bitwise operators, we get truncated to 32bits
                return new Date((seconds * 1000) + Math.round(nanoseconds / 1E6))
            // case 12:
            default:
                throw new Error('timestamp 96 is not yet implemented');
        }
    }
}

//保留js类型的扩展（实现列表）
export const jsNativeExtList: readonly CodecExtApi[] = (function () {
    const arr: Array<CodecExtApi> = [CodecExtDate.INSTANCE];
    if (typeof (BigInt) != "undefined") {
        arr.push({
            get TYPE(): number {
                return 254;
            },
            get CLASS(): NewableType {
                return <any>BigInt;
            },
            encode(v: bigint, out: OutStream, encoder: Encoder): OutStream {
                let uarr = new Uint8Array(9), udv = new DataView(uarr.buffer);
                if (v >= 0) {
                    udv.setUint8(0, 0);
                    udv.setBigUint64(1, v);
                } else {
                    udv.setUint8(0, 1);
                    udv.setBigUint64(1, v);
                }
                return encoder.encodeExt(254, uarr, out);
            },
            decode(ins: InStream, decoder) {
                return ins.u8() == 1 ? ins.i64() : ins.u64();
            }
        });
    }
    const JsCodecExtSet: CodecExtApi = {
        get TYPE(): number {
            return 253;
        },
        get CLASS(): NewableType {
            return Set;
        },
        decode(ins: InStream, decoder: Decoder) {
            let r = new Set<any>(), n = decoder.decodeArraySize(ins);
            for (let i = 0; i < n; i++) {
                r.add(decoder.decode(ins));
            }
            return r;
        },
        encode(v: Set<any>, out: OutStream, encoder: Encoder): OutStream {
            let tmpO = new OutStream();
            encoder.encodeArraySize(v.size, tmpO);
            v.forEach(e => {
                encoder.encode(e, tmpO)
            });
            encoder.encodeExt(this.TYPE, tmpO.bin(), out);
            return out;
        },
    }
    const JsCodecExtMap: CodecExtApi = {
        get TYPE(): number {
            return 252;
        },
        get CLASS(): NewableType {
            return Map;
        },
        decode(ins: InStream, decoder: Decoder) {
            let r = new Map<any, any>(), n = decoder.decodeMapSize(ins);
            for (let i = 0; i < n; i++) {
                r.set(decoder.decode(ins), decoder.decode(ins));
            }
            return r;
        },
        encode(v: Map<any, any>, out: OutStream, encoder: Encoder): OutStream {
            let tmpO = new OutStream();
            encoder.encodeMapSize(v.size, tmpO);
            v.forEach((iv, ik) => {
                encoder.encode(ik, tmpO);
                encoder.encode(iv, tmpO);
            });
            return encoder.encodeExt(this.TYPE, tmpO.bin(), out);
        }
    }
    arr.push(JsCodecExtSet, JsCodecExtMap);
    function newJsTypeArrayCodecExt(Clazz: NewableType, Type: number): CodecExtApi {
        return {
            get TYPE(): number {
                return Type;
            },
            get CLASS(): NewableType {
                return Clazz;
            },
            encode(v, out: OutStream, encoder: Encoder): OutStream {
                let buf = v.buffer;
                return encoder.encodeExt(Type, new Uint8Array(buf), out);
            },
            decode(ins: InStream, decoder) {
                let T: any = Clazz;
                return new T(ins.bin().buffer);
            }
        }
    }
    let TypeS: any[] = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    if (typeof (BigInt) != "undefined") {
        TypeS.push(BigInt64Array, BigUint64Array);
    }
    TypeS.forEach((t, i) => {
        arr.push(newJsTypeArrayCodecExt(t, 251 - i));
    });
    return Object.freeze(arr);
})();


export class MsgPacker {
    private _encoder: Encoder;
    private _decoder: Decoder;
    constructor(config?: { long?: CodecLongApi, extends?: Array<CodecExtApi>, floatAs32?: boolean, mapAsReal?: boolean, mapCheckIntKey?: boolean, mapKeepNilVal?: boolean, }) {
        this._encoder = new Encoder(config);
        this._decoder = new Decoder(config);
    }
    public encode(v: any): Uint8Array {
        return this._encoder.encode(v).bin();
    }
    public decode(v: Uint8Array): any {
        return this._decoder.decode(new InStream(v.buffer));
    }

    private static _def: MsgPacker;
    public static get Default(): MsgPacker {
        if (!this._def) {
            this._def = new MsgPacker();
        }
        return this._def;
    }
    private static _jsNative: MsgPacker;
    public static get JsNative(): MsgPacker {
        if (!this._jsNative) {
            this._jsNative = new MsgPacker({
                extends: jsNativeExtList.map(e => e)
            });
        }
        return this._jsNative;
    }
}

export function pack(v: any): Uint8Array {
    return MsgPacker.Default.encode(v);
}
export function unpack(v: Uint8Array): any {
    return MsgPacker.Default.decode(v);
}
export function packJs(v: any): Uint8Array {
    return MsgPacker.JsNative.encode(v);
}
export function unpackJs(v: Uint8Array): any {
    return MsgPacker.JsNative.decode(v);
}