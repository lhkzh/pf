import { CodecExtApi, CodecLongApi } from "./codec_ext_api";
import { CodecDate } from "./CodecDate";
import { CodecLong } from "./CodecLong";
import { InStream } from "./InStream";

export class Decoder {
    private mapAsReal: boolean;
    private long: CodecLongApi;
    private extends: Array<CodecExtApi>;

    constructor(config?: { mapAsReal?: boolean, long?: CodecLongApi, extends?: Array<CodecExtApi> }) {
        this.long = config && config.long || new CodecLong();
        this.mapAsReal = config && config.mapAsReal || false;
        this.extends = config && config.extends || [];
        if (this.extends.find(e => e.isImp(new Date())) == null) {
            this.extends.push(new CodecDate());
        }
    }

    public decode(b: InStream) {
        let k = b.u8();
        if (k <= 0x7f || k >= 0xe0) {//fixInt
            return k;
        }
        if ((k & 0xf0) == 0x90) {//fixedArray
            return this.decodeArray(b, k & 0x0F);
        }
        if ((k & 0xe0) == 0x80) {//fixedMap
            return this.decodeMap(b, k & 0x0F);
        }
        if ((k & 0xe0) == 0xa0) {//fixedString
            return b.str(k & 0x1F)
        }
        switch (k) {
            case 0xc0:
                return null;
            case 0xc2:
                return false;
            case 0xc3:
                return true;
            case 0xca:
                return b.float();
            case 0xcb:
                return b.double();
            case 0xd0:
                return b.i8();
            case 0xd1:
                return b.i16();
            case 0xd2:
                return b.i32();
            case 0xcc:
                return b.u8();
            case 0xcd:
                return b.u16();
            case 0xce:
                return b.u32();
            case 0xd3:
                return this.long.toAuto(this.long.decodeNegative(b));
            case 0xcf:
                return this.long.toAuto(this.long.decodePositive(b));
            case 0xdc:
                return this.decodeArray(b, b.u16());
            case 0xdd:
                return this.decodeArray(b, b.u32());
            case 0xde:
                return this.decodeMap(b, b.u16());
            case 0xdf:
                return this.decodeMap(b, b.u32());
            case 0xd9:
                return b.str(b.u8());
            case 0xda:
                return b.str(b.u16());
            case 0xdb:
                return b.str(b.u32());
            case 0xc4:
                return b.bin(b.u8());
            case 0xc5:
                return b.bin(b.u16());
            case 0xc6:
                return b.bin(b.u32());
            case 0xd4:
                return this.decodeExt(b, 1, b.u8());
            case 0xd5:
                return this.decodeExt(b, 2, b.u8());
            case 0xd6:
                return this.decodeExt(b, 4, b.u8());
            case 0xd7:
                return this.decodeExt(b, 8, b.u8());
            case 0xd8:
                return this.decodeExt(b, 16, b.u8());
            case 0xc7:
                return this.decodeExt(b, b.u8(), b.u8());
            case 0xc8:
                return this.decodeExt(b, b.u16(), b.u8());
            case 0xc9:
                return this.decodeExt(b, b.u32(), b.u8());
            default:
                throw new Error("bad format:" + k);
        }
    }
    public decodeArray(b: InStream, count: number) {
        let a = new Array(count);
        for (let i = 0; i < count; i++) {
            a[i] = this.decode(b);
        }
        return a;
    }
    public decodeMap(b: InStream, count: number) {
        if (this.mapAsReal) {
            let m = new Map();
            for (let i = 0; i < count; i++) {
                m.set(this.decode(b), this.decode(b));
            }
            return m;
        } else {
            let m: any = {};
            for (let i = 0; i < count; i++) {
                m[this.decode(b)] = this.decode(b);
            }
            return m;
        }
    }
    public decodeExt(b: InStream, len: number, type: number) {
        let ebs = new InStream(b.bin(len).buffer);
        let ext = this.extends.find(e => e.isType(type));
        if (ext) {
            return ext.decode(ebs, len);
        }
        return { msg: "unknow", type: type, data: ebs.bin() };
    }
}

export function unpackStr(b: InStream) {
    var k: any = b.u8();
    if (k == 0xc0) {
        return null;
    }
    if ((k & 0xe0) == 0xa0) {//fixedString
        return b.str(k & 0x1F);
    } else if (k == 0xd9) {
        return b.str(b.u8());
    } else if (k == 0xda) {
        return b.str(b.u16());
    } else if (k == 0xdb) {
        return b.str(b.u32());
    }
    return undefined;
}