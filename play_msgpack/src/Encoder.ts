import { CodecExtApi, CodecLongApi, NewableType } from "./codec_api";
import { CodecExtDate, CodecLong } from "./codec_imp";
import { OutStream } from "./OutStream";
import { Str } from "./utf8";
import { InStream } from "./InStream";


export class Encoder {
    private long: CodecLongApi;
    private floatAs32: boolean;
    private extends: Map<NewableType, CodecExtApi>;
    private mapCheckIntKey: boolean;
    public mapKeepNilVal: boolean;

    constructor(public config?: { mapCheckIntKey?: boolean, mapKeepNilVal?: boolean, floatAs32?: boolean, long?: CodecLongApi, extends?: Array<CodecExtApi> }) {
        this.long = config && config.long || new CodecLong();
        this.floatAs32 = config && config.floatAs32 || false;
        this.mapCheckIntKey = config && config.mapCheckIntKey || false;
        this.mapKeepNilVal = config && config.mapKeepNilVal || false;
        this.extends = new Map();
        this.extends.set(CodecExtDate.INSTANCE.CLASS, CodecExtDate.INSTANCE);
        if (config && config.extends && config.extends.length) {
            config.extends.forEach(e => {
                this.extends.set(e.CLASS, e);
            });
        }
        if (!this.extends.has(Map)) {
            this.extends.set(Map, {
                get CLASS(): NewableType {
                    return Map;
                },
                get TYPE(): number { return 0; },
                decode: (ins: InStream, decoder: any): any => null,
                encode: (v: Map<any, any>, out: OutStream, encoder: Encoder) => {
                    encoder.encodeMapSize(v.size, out);
                    v.forEach((iv, ik) => {
                        encoder.encode(ik, out);
                        encoder.encode(iv, out);
                    });
                    return out;
                }
            });
        }
        if (!this.extends.has(Set)) {
            this.extends.set(Set, {
                get CLASS(): NewableType {
                    return Set;
                },
                get TYPE(): number { return 0; },
                decode: (ins: InStream, decoder: any): any => null,
                encode: (v: Set<any>, out: OutStream, encoder: Encoder) => {
                    encoder.encodeArraySize(v.size, out);
                    v.forEach(iv => {
                        encoder.encode(iv, out);
                    });
                    return out;
                }
            });
        }
    }

    public encode(v: any, out: OutStream = new OutStream()): OutStream {
        if (v == null) {//v==null || v == undefined
            return out.u8(0xc0);
        } else if (v.constructor == Boolean) {
            return out.u8(v ? 0xc3 : 0xc2);
        } else if (v.constructor == Number) {
            return this.encodeNumber(<number>v, out);
        } else if (v.constructor == String) {
            return this.encodeStr(<string>v, out);
        } else if (v.constructor == Array) {
            this.encodeArraySize(v.length, out);
            for (let i = 0; i < v.length; i++) {
                this.encode(v[i], out);
            }
            return out;
        } else if (v.constructor == Object) {
            let keys = Object.keys(v);
            if (!this.mapKeepNilVal) {
                keys = keys.filter(k => v[k] != null);
            }
            this.encodeMapSize(keys.length, out);
            if (this.mapCheckIntKey) {
                for (let k of keys) {
                    let ik = Number.parseInt(k);
                    if (Number.isSafeInteger(ik) && ik.toString() == k) {
                        this.encodeIntNumber(ik, out);
                    } else {
                        this.encodeStr(k, out);
                    }
                    this.encode(v[k], out);
                }
            } else {
                for (let k of keys) {
                    this.encodeStr(k, out);
                    this.encode(v[k], out);
                }
            }
            return out;
        } else if (ArrayBuffer.isView(v)) {
            return this.encodeBin(new Uint8Array(v.buffer), out);
        } else if (typeof (Buffer) != "undefined" && Buffer.isBuffer(v)) {//fibjs
            return this.encodeBin(new Uint8Array(v.buffer), out);
        } else {
            let ext = this.extends.get(v.constructor);
            if (ext) {
                return ext.encode(v, out, this);
            } else if (this.long.isImp(v)) {
                return this.long.encode(v, out);
            }
            throw new Error('Msgpack encode not imp:' + v.constructor?.name + "-" + ext);
        }
    }
    public encodeArraySize(length: number, out: OutStream) {
        if (length < 16) {
            out.u8(0x90 | length);
        } else if (length < 0xffff) {
            out.u8(0xdc).u16(length);
        } else {
            out.u8(0xdd).u32(length);
        }
        return out;
    }
    public encodeMapSize(length: number, out: OutStream) {
        if (length < 16) {
            out.u8(0x80 | length);
        } else if (length < 0xffff) {
            out.u8(0xde).u16(length);
        } else {
            out.u8(0xdf).u32(length);
        }
        return out;
    }
    public encodeStr(v: string, out: OutStream) {
        let b = Str.encode(v), n = b.length;
        if (n < 32) {
            out.u8(0xa0 | n);
        } else if (n < 256) {
            out.u8(0xd9).u8(n);
        } else if (n <= 0xffff) {
            out.u8(0xda).u16(n);
        } else {
            out.u8(0xdb).u32(n);
        }
        return out.blob(b);
    }
    public encodeNumber(v: number, out: OutStream) {
        if (Number.isInteger(v)) {
            return this.encodeIntNumber(v, out);
        }
        if (this.floatAs32) {
            return out.u8(0xca).float(v);
        }
        return out.u8(0xcb).double(v);
    }
    public encodeIntNumber(v: number, out: OutStream) {
        if (v < 0) {
            if (v >= -128) {
                return out.u8(0xd0).i8(v);
            } else if (v >= -(1 << 15)) {
                return out.u8(0xd1).i16(v);
            } else if (v >= (1 << 31)) {
                return out.u8(0xd2).i32(v);
            }
        } else {
            if (v < 128) {
                return out.i8(v);
            } else if (v < 256) {
                return out.bu(0xcc, v);
            } else if (v < (1 << 16)) {
                return out.u8(0xcd).u16(v);
            } else if (v < (1 << 32)) {
                return out.u8(0xce).u32(v);
            }
        }
        return this.long.encode(v, out);
    }
    public encodeBin(v: Uint8Array, out: OutStream) {
        if (v.length < 256) {
            return out.u8(0xc4).u8(v.length).blob(v);
        } else if (v.length <= 0xffff) {
            return out.u8(0xc5).u16(v.length).blob(v);
        } else {
            return out.u8(0xc6).u32(v.length).blob(v);
        }
    }
    public encodeExt(type: number, bin: Uint8Array, out: OutStream) {
        return this.encodeExtHeader(type, bin.length, out).blob(bin);
    }
    private ExtLens: number[] = [0, 0xd4, 0xd5, 0, 0xd6, 0, 0, 0, 0xd7];//{1:0xd4,2:0xd5,4:0xd6,8:0xd7};
    //写扩展的类型type和长度length
    public encodeExtHeader(type: number, length: number, out: OutStream) {
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