import { CodecExtApi, CodecLongApi, NewableType } from "./codec_api";
import { CodecExtDate, CodecLongImp } from "./codec_imp";
import { OutStream } from "./OutStream";
import { Str } from "./utf8";

/**
 * @public
 */
export class Encoder {
    private long: CodecLongApi;
    private floatAs32: boolean;
    private throwIfUnknow: boolean;
    private extends: Map<NewableType, CodecExtApi>;
    private mapCheckIntKey: boolean;
    public mapKeepNilVal: boolean;

    constructor(public config?: { mapCheckIntKey?: boolean, mapKeepNilVal?: boolean, floatAs32?: boolean, long?: CodecLongApi, extends?: Array<CodecExtApi>, throwIfUnknow?: boolean }) {
        this.long = config && config.long || CodecLongImp;
        this.floatAs32 = config && config.floatAs32 || false;
        this.mapCheckIntKey = config && config.mapCheckIntKey || false;
        this.mapKeepNilVal = config && config.mapKeepNilVal || false;
        this.throwIfUnknow = config && config.throwIfUnknow || false;
        this.extends = new Map();
        this.extends.set(CodecExtDate.INSTANCE.CLASS, CodecExtDate.INSTANCE);
        if (config && config.extends && config.extends.length) {
            config.extends.forEach(e => {
                this.extends.set(e.CLASS, e);
            });
        }
        let vFactory = (t: NewableType, encode: (v: any, out: OutStream, encoder: Encoder) => void) => {
            return {
                get CLASS(): NewableType {
                    return t;
                },
                get TYPE(): number { return 0; },
                decode: (ins: any, decoder: any): any => null,
                encode: encode
            }
        }
        if (!this.extends.has(Map)) {
            this.extends.set(Map, vFactory(Map, (v: Map<any, any>, out: OutStream, encoder: Encoder) => {
                encoder.map(v, out);
            }));
        }
        if (!this.extends.has(Set)) {
            this.extends.set(Set, vFactory(Set, (v: Set<any>, out: OutStream, encoder: Encoder) => {
                encoder.set(v, out);
            }));
        }
        if (typeof (Buffer) != "undefined" && !this.extends.has(<any>Buffer)) {
            this.extends.set(<any>Buffer, vFactory(<any>Buffer, (v: Buffer, out: OutStream, encoder: Encoder) => {
                encoder.bin(new Uint8Array(v), out);
            }));
        }
    }

    public encode(v: any, out: OutStream = new OutStream()): OutStream {
        if (v == null) {//v==null || v == undefined
            return out.u8(0xc0);
        }
        const ctor = v.constructor;
        if (ctor == Boolean) {
            out.u8(v ? 0xc3 : 0xc2);
        } else if (ctor == Number) {
            this.number(v, out);
        } else if (ctor == String) {
            this.str(<string>v, out);
        } else if (ctor == Array) {
            this.arr(v, out);
        } else if (ctor == Object) {
            this.obj(v, out);
        } else {
            let ext = this.extends.get(ctor);
            if (ext) {
                ext.encode(v, out, this);
            } else if (this.long.isImp(v)) {
                this.long.encode(v, out);
            } else if (ArrayBuffer.isView(v)) {
                if (ctor == Uint8Array) {
                    this.bin(<Uint8Array>v, out);
                } else {//TypedArray(except Uint8Array)
                    let iarr: Array<number | bigint> = <any>v;
                    this.arrSize(iarr.length, out);
                    if (ctor == Float32Array) {
                        for (let i = 0; i < iarr.length; i++) {
                            out.u8(0xca).float(<number>iarr[i]);
                        }
                    } else if (ctor == Float64Array) {
                        for (let i = 0; i < iarr.length; i++) {
                            out.u8(0xcb).double(<number>iarr[i]);
                        }
                    } else if (ctor.name.substr(0, 3) == 'Big') {
                        for (let i = 0; i < iarr.length; i++) {
                            this.long.encode(iarr[i], out);
                        }
                    } else {
                        for (let i = 0; i < iarr.length; i++) {
                            this.int(<number>iarr[i], out);
                        }
                    }
                }
            } else {
                if (this.throwIfUnknow) {
                    throw new Error(`Msgpack encode not imp:${ctor.name}-${ext}`);
                } else {
                    this.objFast(v, out);
                }
            }
        }
        return out;
    }
    public nil(out: OutStream) {
        out.u8(0xc0);
    }
    public bool(v: boolean, out: OutStream) {
        out.u8(v ? 0xc3 : 0xc2);
    }
    public arrSize(length: number, out: OutStream) {
        if (length < 16) {
            out.u8(0x90 | length);
        } else if (length <= 0xffff) {
            out.u8(0xdc).u16(length);
        } else {
            out.u8(0xdd).u32(length);
        }
    }
    public mapSize(length: number, out: OutStream) {
        if (length < 16) {
            out.u8(0x80 | length);
        } else if (length <= 0xffff) {
            out.u8(0xde).u16(length);
        } else {
            out.u8(0xdf).u32(length);
        }
    }
    public arr(v: any[], out: OutStream) {
        this.arrSize(v.length, out);
        for (let i = 0; i < v.length; i++) {
            this.encode(v[i], out);
        }
    }
    public obj(v: any, out: OutStream) {
        let keys = Object.keys(v);
        if (!this.mapKeepNilVal) {
            keys = keys.filter(k => v[k] != null);
        }
        this.mapSize(keys.length, out);
        if (this.mapCheckIntKey) {
            for (let k: string, i = 0; i < keys.length; i++) {
                k = keys[i];
                let ik = Number.parseInt(k);
                if (Number.isSafeInteger(ik) && ik.toString() == k) {
                    this.int(ik, out);
                } else {
                    this.str(k, out);
                }
                this.encode(v[k], out);
            }
        } else {
            for (let k: string, i = 0; i < keys.length; i++) {
                k = keys[i];
                this.str(k, out);
                this.encode(v[k], out);
            }
        }
    }
    public objFast(v: any, out: OutStream) {
        let keys = Object.keys(v);
        this.mapSize(keys.length, out);
        for (let k: string, i = 0; i < keys.length; i++) {
            k = keys[i];
            this.str(k, out);
            this.encode(v[k], out);
        }
    }
    public map(v: Map<any, any>, out: OutStream) {
        this.mapSize(v.size, out);
        v.forEach((iv, ik) => {
            this.encode(ik, out);
            this.encode(iv, out);
        });
    }
    public set(v: Set<any>, out: OutStream) {
        this.arrSize(v.size, out);
        v.forEach(iv => {
            this.encode(iv, out);
        });
    }
    public date(v: Date, out: OutStream) {
        this.extends.get(Date)?.encode(v, out, this);
    }
    public str(v: string, out: OutStream) {
        let b = Str.encode(v), n = b.length;
        if (n < 32) {
            out.u8(0xa0 | n);
        } else if (n <= 0xff) {
            out.u8(0xd9).u8(n);
        } else if (n <= 0xffff) {
            out.u8(0xda).u16(n);
        } else {
            out.u8(0xdb).u32(n);
        }
        out.blob(b);
    }
    public number(v: number, out: OutStream) {
        if (Number.isInteger(v)) {
            this.int(v, out);
        } else if (this.floatAs32) {
            out.u8(0xca).float(v);
        } else {
            out.u8(0xcb).double(v);
        }
    }
    public int(v: number, out: OutStream) {
        if (v < 0) {
            if (v >= -0x20) {
                out.u8(0x100 + v)
            } else if (v >= -128) {
                out.u8(0xd0).i8(v);
            } else if (v >= -0x8000) {
                out.u8(0xd1).i16(v);
            } else if (v >= -0x80000000) {
                out.u8(0xd2).i32(v);
            } else {
                this.long.encode(v, out);
            }
        } else {
            if (v < 128) {
                out.u8(v);
            } else if (v < 0x100) {
                out.bu(0xcc, v);
            } else if (v < 0x10000) {
                out.u8(0xcd).u16(v);
            } else if (v <= 0xffffffff) {
                out.u8(0xce).u32(v);
            } else {
                this.long.encode(v, out);
            }
        }
    }
    public bin(v: Uint8Array, out: OutStream) {
        if (v.length < 256) {
            out.u8(0xc4).u8(v.length).blob(v);
        } else if (v.length <= 0xffff) {
            out.u8(0xc5).u16(v.length).blob(v);
        } else {
            out.u8(0xc6).u32(v.length).blob(v);
        }
    }
    public ext(type: number, bin: Uint8Array, out: OutStream) {
        this.extHeader(type, bin.length, out).blob(bin);
    }
    private ExtLens: number[] = [0, 0xd4, 0xd5, 0, 0xd6, 0, 0, 0, 0xd7];//{1:0xd4,2:0xd5,4:0xd6,8:0xd7};
    //写扩展的类型type和长度length
    public extHeader(type: number, length: number, out: OutStream) {
        if (length <= 0xff) {
            let c = this.ExtLens[length];
            if (c > 0) {
                out.bu(c, type);
            } else {
                out.bu(0xc7, length).i8(type);
            }
        } else if (length < 0xffff) {
            out.u8(0xc8).u16(length).i8(type);
        } else {
            out.u8(0xc9).u32(length).i8(type);
        }
        return out;
    }
}
