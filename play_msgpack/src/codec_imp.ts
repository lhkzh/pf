import { CodecExtApi, CodecLongApi, NewableType } from "./codec_api";
import { Decoder } from "./Decoder";
import { Encoder } from "./Encoder";
import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

//bigint(or not safe Integer)
export const CodecLongImp: CodecLongApi = typeof (BigInt) != undefined ? {
    isImp(v: any) {
        return typeof (v) == "bigint";
    },
    toAuto(v: any) {
        let n = Number(v);
        if (Number.isSafeInteger(n)) {
            return n;
        }
        return v;
    },
    encode(v: any, out: OutStream) {
        v = BigInt(v);
        if (v < 0) {
            out.u8(0xd3).i64(v);
        } else {
            out.u8(0xcf).u64(v);
        }
    },
    decodeNegative(ins: InStream): any {
        return ins.i64();
    },
    decodePositive(ins: InStream): any {
        return ins.u64();
    },
} : {
    isImp(v: any) {
        return Number.isInteger(v) && Number.isSafeInteger(v);
    },
    toAuto(v: any) {
        return Number(v);
    },
    encode(v: any, out: OutStream) {
        let neg = v < 0;
        if (neg) {
            v = -v;
        }
        let high = (v / 4294967296) | 0, low = v % 4294967296;
        if (neg) {
            high = ~high; low = ~low;
            var a48 = high >>> 16,
                a32 = high & 0xFFFF,
                a16 = low >>> 16;
            var c48 = 0, c32 = 0, c16 = 0, c00 = (low & 0xFFFF) + 1;
            c16 += c00 >>> 16;
            c00 &= 0xFFFF;
            c16 += a16;
            c32 += c16 >>> 16;
            c16 &= 0xFFFF;
            c32 += a32;
            c48 += c32 >>> 16;
            c32 &= 0xFFFF;
            c48 += a48;
            c48 &= 0xFFFF;
            low = (c16 << 16) | c00;
            high = (c48 << 16) | c32;
        }
        out.u32(high).u32(low);
    },
    decodeNegative(ins: InStream): any {
        const high = ins.i32(), low = ins.i32();
        return high * 4294967296 + low;
    },
    decodePositive(ins: InStream): any {
        const high = ins.u32(), low = ins.u32();
        return high * 4294967296 + low;
    }
};

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
            out.bu(0xd7, 255).i32(upper).i32(lower);
        } else {// Timestamp32
            out.bu(0xd6, 255).i32(Math.floor(millis / 1000));
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
            encode(v: bigint, out: OutStream, encoder: Encoder) {
                let uarr = new Uint8Array(9), udv = new DataView(uarr.buffer);
                if (v >= 0) {
                    udv.setUint8(0, 0);
                    udv.setBigUint64(1, v);
                } else {
                    udv.setUint8(0, 1);
                    udv.setBigUint64(1, v);
                }
                encoder.encodeExt(this.TYPE, uarr, out);
            },
            decode(ins: InStream, decoder) {
                return ins.u8() == 1 ? ins.i64() : ins.u64();
            }
        });
    }
    if (typeof (Buffer) != "undefined") {
        arr.push({
            get TYPE(): number {
                return 253;
            },
            get CLASS(): NewableType {
                return <any>Buffer;
            },
            encode(v: Buffer, out: OutStream, encoder: Encoder) {
                encoder.encodeExt(this.TYPE, new Uint8Array(v), out);
            },
            decode(ins: InStream, decoder) {
                return Buffer.from(ins.bin(ins.less));
            }
        });

    }
    const JsCodecExtSet: CodecExtApi = {
        get TYPE(): number {
            return 252;
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
        encode(v: Set<any>, out: OutStream, encoder: Encoder) {
            let tmpO = new OutStream();
            encoder.encodeArraySize(v.size, tmpO);
            v.forEach(e => {
                encoder.encode(e, tmpO)
            });
            encoder.encodeExt(this.TYPE, tmpO.sub(), out);
        }
    }
    const JsCodecExtMap: CodecExtApi = {
        get TYPE(): number {
            return 251;
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
        encode(v: Map<any, any>, out: OutStream, encoder: Encoder) {
            let tmpO = new OutStream();
            encoder.encodeMapSize(v.size, tmpO);
            v.forEach((iv, ik) => {
                encoder.encode(ik, tmpO);
                encoder.encode(iv, tmpO);
            });
            encoder.encodeExt(this.TYPE, tmpO.sub(), out);
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
            encode(v, out: OutStream, encoder: Encoder) {
                encoder.encodeExt(Type, new Uint8Array(v.buffer), out);
            },
            decode(ins: InStream, decoder) {
                let T: any = Clazz;
                return new T(ins.bin(ins.less).buffer);
            }
        }
    }
    let TypeS: any[] = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    if (typeof (BigInt) != "undefined") {
        TypeS.push(BigInt64Array, BigUint64Array);
    }
    TypeS.forEach((t, i) => {
        arr.push(newJsTypeArrayCodecExt(t, 250 - i));
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
    public get encoder() {
        return this._encoder;
    }
    public get decoder() {
        return this._decoder;
    }

    public pack(v: any, out?: OutStream): Uint8Array {
        return this._encoder.encode(v, out).bin();
    }
    public unpack(v: Uint8Array): any {
        return this._decoder.decode(new InStream(v, 0, v.length));
    }

    public encode(v: any, out: OutStream): OutStream {
        return this._encoder.encode(v, out);
    }
    public decode(v: InStream): any {
        return this._decoder.decode(v);
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
    return MsgPacker.Default.pack(v);
}
export function unpack(v: Uint8Array): any {
    return MsgPacker.Default.unpack(v);
}
export function packJs(v: any): Uint8Array {
    return MsgPacker.JsNative.pack(v);
}
export function unpackJs(v: Uint8Array): any {
    return MsgPacker.JsNative.unpack(v);
}