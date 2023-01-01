import { CodecExtApi, CodecLongApi, DecoderApiConfig } from "./codec_api";
import { CodecExtDate, CodecLongImp } from "./codec_imp";
import { InStream } from "./InStream";
/**
 * @public
 */
export class Decoder {
    private extends: Map<number, CodecExtApi>;
    private throwIfUnknow: boolean;
    private mapAsReal: boolean;
    private long: CodecLongApi;

    constructor(public config?: DecoderApiConfig) {
        this.long = config && config.long || CodecLongImp;
        this.mapAsReal = config && config.mapAsReal || false;
        this.throwIfUnknow = config && config.throwIfUnknow || false;
        this.extends = new Map();
        this.extends.set(CodecExtDate.INSTANCE.TYPE, CodecExtDate.INSTANCE);
        if (config && config.extends && config.extends.length) {
            config.extends.forEach(e => {
                this.extends.set(e.TYPE, e);
            });
        }
    }

    public decode(b: InStream) {
        let k = b.u8();
        if (k <= 0x7f) { //fixInt
            return k;
        } else if (k >= 0xe0) {//fixInt
            return k - 0x100;
        }
        if ((k & 0xf0) == 0x90) {//fixedArray
            return this.arrBy(b, k & 0x0F);
        }
        if ((k & 0xe0) == 0x80) {//fixedMap
            return this.objBy(b, k & 0x0F);
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
                return this.arrBy(b, b.u16());
            case 0xdd:
                return this.arrBy(b, b.u32());
            case 0xde:
                return this.objBy(b, b.u16());
            case 0xdf:
                return this.objBy(b, b.u32());
            case 0xd9:
                return b.str(b.u8());
            case 0xda:
                return b.str(b.u16());
            case 0xdb:
                return b.str(b.u32());
            case 0xc4:
                return b.sub(b.u8());
            case 0xc5:
                return b.sub(b.u16());
            case 0xc6:
                return b.sub(b.u32());
            case 0xd4:
                return this.ext(b, 1, b.u8());
            case 0xd5:
                return this.ext(b, 2, b.u8());
            case 0xd6:
                return this.ext(b, 4, b.u8());
            case 0xd7:
                return this.ext(b, 8, b.u8());
            case 0xd8:
                return this.ext(b, 16, b.u8());
            case 0xc7:
                return this.ext(b, b.u8(), b.u8());
            case 0xc8:
                return this.ext(b, b.u16(), b.u8());
            case 0xc9:
                return this.ext(b, b.u32(), b.u8());
            default:
                throw new Error("bad format:" + k);
        }
    }
    /**
     * 查看输入流b的下一个msgpack码是否为null标记
     */
    public isNil(b: InStream) {
        return b.see() == 0xc0;
    }
    public arrSize(b: InStream): number {
        let k = b.u8();
        if ((k & 0xf0) == 0x90) {//fixedArray
            return k & 0x0F;
        } else if (k == 0xdc) {
            return b.u16();
        } else if (k == 0xdd) {
            return b.u32();
        }
        throw new Error("bad arr header:" + k);
    }
    public mapSize(b: InStream): number {
        let k = b.u8();
        if ((k & 0xe0) == 0x80) {//fixedMap
            return k & 0x0F;
        } else if (k == 0xde) {
            return b.u16();
        } else if (k == 0xdf) {
            return b.u32();
        }
        throw new Error("bad map header:" + k);
    }
    public arrBy(b: InStream, count: number): any[] {
        let a = [];
        for (let i = 0; i < count; i++) {
            a[i] = this.decode(b);
        }
        return a;
    }
    public objBy(b: InStream, count: number, asRealMap: boolean = this.mapAsReal): { [index: string]: any } | { [index: number]: any } | Map<any, any> {
        if (asRealMap) {
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
    public obj(b: InStream): { [index: string]: any } | { [index: number]: any } {
        return this.objBy(b, this.mapSize(b), false);
    }
    public map(b: InStream): Map<any, any> {
        return <Map<any, any>>this.objBy(b, this.mapSize(b), true);
    }
    public arr(b: InStream): any[] {
        return this.arrBy(b, this.arrSize(b));
    }
    public set(b: InStream): Set<any> {
        let n = this.arrSize(b), s: Set<any> = new Set();
        for (let i = 0; i < n; i++) {
            s.add(this.decode(b));
        }
        return s;
    }
    public ext(b: InStream, len: number, type: number): any {
        let ebs = b.child(len);//new InStream(b.bin(len));
        let ext = this.extends.get(type);
        if (ext) {
            return ext.decode(ebs, this);
        }
        if (this.throwIfUnknow) {
            throw new Error(`Msgpack decode not support ext:${type}`);
        }
        return { msg: "unknow", type: type, data: ebs.src() };
    }
    public number(b: InStream): number | bigint {
        let k = b.u8();
        if (k <= 0x7f) { //fixInt
            return k;
        } else if (k >= 0xe0) {//fixInt
            return k - 0x100;
        }
        switch (k) {
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
        }
        throw new Error("bad number header:" + k);
    }
    public str(b: InStream): string {
        let k = b.u8();
        if ((k & 0xe0) == 0xa0) {//fixedString
            return b.str(k & 0x1F)
        }
        switch (k) {
            case 0xd9:
                return b.str(b.u8());
            case 0xda:
                return b.str(b.u16());
            case 0xdb:
                return b.str(b.u32());
        }
        throw new Error("bad str header:" + k);
    }
    public bin(b: InStream): Uint8Array {
        let k = b.u8();
        switch (k) {
            case 0xc4:
                return b.sub(b.u8());
            case 0xc5:
                return b.sub(b.u16());
            case 0xc6:
                return b.sub(b.u32());
        }
        throw new Error("bad bytes header:" + k);
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