export module MsgPack {

    export function decode(b: ArrayBuffer | { buffer: ArrayBuffer, byteLength: number }) {
        return unpack(new InStream(b instanceof ArrayBuffer ? <ArrayBuffer>b : b.buffer));
    }

    export function encode(v: any, out?: OutStream): Uint8Array {
        return pack(v, out || new OutStream(Opt.capInit, Opt.capIncr)).bin();
    }

    export function decode2(input: InStream) {
        return unpack(input);
    }

    export function encode2(v: any, out: OutStream) {
        return pack(v, out);
    }

    const ExtNativeTypesArray = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    const ExtNativeEncoderMap = new Map();
    // let ExtBigInt: { is: (v: any) => boolean, isSafe: (v: any) => boolean, toNumber: (v: any) => number, encodeX: (v: any, out: OutStream) => void, decodeX: (v: Uint8Array) => any } = null;
    ExtNativeEncoderMap.set((new Date()).constructor, (obj: Date, out: OutStream) => {
        return packDate(obj, out);
    });
    if (typeof (BigInt) == "function") {
        ExtNativeEncoderMap.set(BigInt, (obj: BigInt, out: OutStream) => {
            return packBigInt(<any>obj, out);
        });
    }
    // ExtNativeEncoderMap.set(Buffer.constructor, (obj:Buffer, out:OutStream)=>{
    //     return packRawSizeHeader(obj.byteLength, out).blob(new Uint8Array(obj).buffer);
    // });
    ExtNativeEncoderMap.set((new Set()).constructor, (obj: Set<any>, out: OutStream) => {
        packArrHeader(obj.size, out);
        for (var e of obj) {
            pack(e, out);
        }
        return out;
    });
    ExtNativeEncoderMap.set((new Map()).constructor, (obj: Map<any, any>, out: OutStream) => {
        var l = obj.size;
        if (l < 16) {
            out.u8(0x80 | l);
        } else {
            out.u8(0xde).u16(l);
        }
        obj.forEach((v, k) => {
            pack(k, out);
            pack(v, out);
        });
        return out;
    });
    ExtNativeEncoderMap.set(ArrayBuffer.constructor, (obj: ArrayBuffer, out: OutStream) => {
        var tmp = new Uint8Array(obj);
        return packRawSizeHeader(tmp.length, out).blob(tmp);
    });
    ExtNativeTypesArray.forEach((c, i) => {
        ExtNativeEncoderMap.set((new (<any>c)()).constructor, (obj: any, out: OutStream) => {
            var tmp = new Uint8Array(obj);
            packExtHeader(254 - i, tmp.length, out);
            return out.blob(tmp);
        });
    });
    const ExtNativeParse = function (type: number, len: number, fromBuf: InStream) {
        if (type == 255) {
            return unpackDate(fromBuf, len);
        }
        let tArrClass = ExtNativeTypesArray[type - 254];
        if (tArrClass) {
            return new tArrClass(<any>fromBuf.bin(len));
        }
        return null;
    }
    const ExtLens: number[] = [0, 0xd4, 0xd5, 0, 0xd6, 0, 0, 0, 0xd7];//{1:0xd4,2:0xd5,4:0xd6,8:0xd7};
    //写扩展的类型type和长度length
    function packExtHeader(type: number, length: number, out: OutStream) {
        if (length <= 0xff) {
            var c = ExtLens[length];
            if (c) {
                out.bu(c, type);
            } else {
                out.bu(0xc7, length).u8(type);
            }
        } else if (length < 0xffff) {
            out.u8(0xc8).u16(length).u8(type);
        } else {
            out.u8(0xc9).u32(length).u8(type);
        }
        return out;
    }

    function packRawSizeHeader(size: number, out: OutStream) {
        if (size < 256) {
            return out.u8(0xc4).u8(size);
        } else if (size <= 0xffff) {
            return out.u8(0xc5).u16(size);
        } else {
            return out.u8(0xc6).u32(size);
        }
    }

    export function packString(v: string, out: OutStream) {
        var b = Str.encode(v), n = b.length;
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

    export function packInt(v: number, out: OutStream) {
        return v < 0 ? packXInt(v, out) : packUInt(v, out);
    }

    export function packXInt(v: number, out: OutStream) {
        if (v >= -128) {
            out.u8(0xd0).i8(v);
        } else if (v >= -32768) {
            out.u8(0xd1).i16(v);
        } else if (v >= (1 << 31)) {
            out.u8(0xd2).i32(v);
        } else {
            // out.u8(0xd3).long(v);
            out.u8(0xcb).double(v);
        }
        return out;
    }

    export function packUInt(v: number, out: OutStream) {
        if (v < 128) {
            out.i8(v);
        } else if (v < 256) {
            out.bu(0xcc, v);
        } else if (v < (1 << 16)) {
            out.u8(0xcd).u16(v);
        } else if (v < (1 << 32)) {
            out.u8(0xce).u32(v);
        } else {
            // out.u8(0xcf).long(v);
            out.u8(0xcb).double(v);
        }
        return out;
    }

    export function packBigInt(v: bigint, out: OutStream) {
        let d = Number(v);
        if (Number.isSafeInteger(d)) {
            packInt(d, out);
        } else {
            if (v < 0) {
                out.u8(0xd3).i64(v);
            } else {
                out.u8(0xcf).u64(v);
            }
        }
        return out;
    }

    function packFloat(v: number, out: OutStream) {
        if (Opt.float32) {
            out.u8(0xca).float(v);
        } else {
            out.u8(0xcb).double(v);
        }
    }

    export function packBool(v: boolean, out: OutStream) {
        return out.u8(v ? 0xc3 : 0xc2);
    }

    export function packNil(out: OutStream) {
        return out.u8(0xc0);
    }
    export function isInt(v: number) {
        return Number.isInteger(v);
    }
    export function isLong(v: any) {
        return typeof (v) == "bigint";
    }
    export function toLong(n: number) {
        return BigInt(n);
    }
    export function toN53(n: bigint) {
        return Number(n);
    }

    export function packArrHeader(arrLength: number, out: OutStream) {
        if (arrLength < 16) {
            out.u8(0x90 | arrLength);
        } else if (arrLength < 0xffff) {
            out.u8(0xdc).u16(arrLength);
        } else {
            out.u8(0xdd).u32(arrLength);
        }
        return out;
    }

    export function packArray(v: any[], out: OutStream) {
        packArrHeader(v.length, out);
        for (var i = 0; i < v.length; i++) {
            pack(v[i], out);
        }
        return out;
    }
    export function packObjHeader(l: number, out: OutStream) {
        if (l < 16) {
            out.u8(0x80 | l);
        } else if (l < 0xffff) {
            out.u8(0xde).u16(l);
        } else {
            out.u8(0xdf).u32(l);
        }
        return out;
    }
    function packObject(v: any, out: OutStream) {
        var a: string[] = Object.keys(v), l = a.length;
        packObjHeader(l, out);
        for (var k of a) {
            packString(k, out);
            pack(v[k], out);
        }
        return out;
    }

    //const RegIntKey = /^[1-9]\d*$/;
    function packIObject(v: any, out: OutStream) {
        var a: string[] = Object.keys(v), l = a.length;
        if (l < 16) {
            out.u8(0x80 | l);
        } else {
            out.u8(0xde).u16(l);
        }
        for (var k of a) {
            packInt(Number(k), out);
            pack(v[k], out);
        }
        return out;
    }
    export function packNative(v: any, out: OutStream) {
        return ExtNativeEncoderMap.get(v.constructor)(v, out);
    }

    export function pack(v: any, out: OutStream): OutStream {
        if (v == null) {
            out.u8(0xc0)
        } else if (Number.isFinite(v)) {
            if (Number.isInteger(v)) {
                packInt(v, out);
            } else {
                packFloat(v, out);
            }
        } else if (Array.isArray(v)) {
            packArray(v, out);
        } else if (v.constructor && ExtNativeEncoderMap.has(v.constructor)) {
            packNative(v, out);
        } else {
            var t = typeof v;
            if (t == "boolean") {
                packBool(v, out);
            } else if (t == "string") {
                packString(v, out);
            } else if (t == "bigint") {
                packBigInt(v, out);
            } else if (v.constructor == Object) {
                packObject(v, out);
            } else if (Ext.encode) {
                Ext.encode(v, out);
            } else {
                packNil(out);//没办法序列化了
            }
        }
        return out;
    }

    export function packExt(v: any, out: OutStream) {
        if (v.constructor && ExtNativeEncoderMap.has(v.constructor)) {
            return ExtNativeEncoderMap.get(v.constructor)(v, out);
        } else if (Ext.encode) {
            return Ext.encode(v, out);
        }
        throw new Error("encode_ext_not_support");
    }

    function unpackArray(b: InStream, len: number) {
        var a = new Array(len);
        for (var i = 0; i < len; i++) {
            a[i] = unpack(b);
        }
        return a;
    }

    function unpackObject(b: InStream, len: number) {
        var a: any = {};
        for (var i = 0; i < len; i++) {
            a[unpack(b)] = unpack(b);
        }
        return a;
    }

    function unpackBin(b: InStream, len: number) {
        return b.bin(len).buffer;
    }

    export function unpackExt(b: InStream, len: number, type: number) {
        var eb = new InStream(b.bin(len).buffer),
            v = ExtNativeParse(type, len, eb);
        if (v) {
            return v;
        }
        if (Ext.decode) {
            return Ext.decode(type, eb);
        }
        return eb.bin();
    }
    export function unpack(b: InStream) {
        var k = b.u8();
        if (k <= 0x7f || k >= 0xe0) {//fixInt
            return k;
        }
        if ((k & 0xf0) == 0x90) {//fixedArray
            return unpackArray(b, k & 0x0F);
        }
        if ((k & 0xe0) == 0x80) {//fixedMap
            return unpackObject(b, k & 0x0F);
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
                return b.i64();
            case 0xcf:
                return b.u64();
            case 0xdc:
                return unpackArray(b, b.u16());
            case 0xdd:
                return unpackArray(b, b.u32());
            case 0xde:
                return unpackObject(b, b.u16());
            case 0xdf:
                return unpackObject(b, b.u32());
            case 0xd9:
                return b.str(b.u8());
            case 0xda:
                return b.str(b.u16());
            case 0xdb:
                return b.str(b.u32());
            case 0xc4:
                return unpackBin(b, b.u8());
            case 0xc5:
                return unpackBin(b, b.u16());
            case 0xc6:
                return unpackBin(b, b.u32());
            case 0xd4:
                return unpackExt(b, 1, b.u8());
            case 0xd5:
                return unpackExt(b, 2, b.u8());
            case 0xd6:
                return unpackExt(b, 4, b.u8());
            case 0xd7:
                return unpackExt(b, 8, b.u8());
            case 0xd8:
                return unpackExt(b, 16, b.u8());
            case 0xc7:
                return unpackExt(b, b.u8(), b.u8());
            case 0xc8:
                return unpackExt(b, b.u16(), b.u8());
            case 0xc9:
                return unpackExt(b, b.u32(), b.u8());
            default:
                throw new Error("bad format:" + k);
        }
    }

    export function unpackNumber(b: InStream) {
        let k: any = b.u8();
        if (k == 0xc0) {
            return undefined;
        }
        if (k <= 0x7f || k >= 0xe0) {//fixInt
            return k;
        }
        switch (k) {
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
                return b.i64();
            case 0xcf:
                return b.u64();
            case 0xca:
                return b.float();
            case 0xcb:
                return b.double();
        }
        return NaN;
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

    export function packDate(d: Date, out: OutStream) {
        var millis = d.getTime()//d * 1
        var seconds = Math.floor(millis / 1000)
        var nanos = (millis - seconds * 1000) * 1e6
        if (nanos || seconds > 0xffffffff) {// Timestamp64
            var upperNanos = nanos * 4
            var upperSeconds = seconds / Math.pow(2, 32)
            var upper = (upperNanos + upperSeconds) & 0xffffffff
            var lower = seconds & 0xffffffff
            return out.bu(0xd7, 255).i32(upper).i32(lower);
        } else {// Timestamp32
            return out.bu(0xd6, 255).i32(Math.floor(millis / 1000));
        }
    }

    export function unpackDate(buf: InStream, len: number) {
        var seconds
        var nanoseconds
        switch (len) {
            case 4:
                // timestamp 32 stores the number of seconds that have elapsed since 1970-01-01 00:00:00 UTC in an 32-bit unsigned integer
                seconds = buf.u32();
                nanoseconds = 0;
                break
            case 8:
                // Timestamp 64 stores the number of seconds and nanoseconds that have elapsed
                // since 1970-01-01 00:00:00 UTC in 32-bit unsigned integers, split 30/34 bits
                var upper = buf.u32(),
                    lower = buf.u32();
                nanoseconds = upper / 4,
                    seconds = ((upper & 0x03) * Math.pow(2, 32)) + lower // If we use bitwise operators, we get truncated to 32bits
                break
            case 12:
                throw new Error('timestamp 96 is not yet implemented')
        }
        // var millis = (seconds * 1000) + Math.round(nanoseconds / 1E6)
        return new Date((seconds * 1000) + Math.round(nanoseconds / 1E6))
    }

    //输出流
    export class OutStream {
        private b: Uint8Array;
        private s: DataView;
        private i: number;

        public constructor(private initCaplity: number, private incrCaplity: number) {
            this.b = new Uint8Array(initCaplity);
            this.s = new DataView(this.b.buffer);
            this.i = 0;
        }

        public reset() {
            this.i = 0;
        }

        public bi(a: number, b: number) {
            let T = this;
            T.c(2);
            T.s.setUint8(T.i++, a);
            T.s.setInt8(T.i++, b);
            return T;
        }
        public bu(a: number, b: number) {
            let T = this;
            T.c(2);
            T.s.setUint8(T.i++, a);
            T.s.setUint8(T.i++, b);
            return T;
        }

        public u8(v: number) {
            let T = this;
            T.c(1);
            T.s.setUint8(T.i++, v);
            return T;
        }

        public u16(v: number) {
            let T = this;
            T.c(2);
            T.s.setUint16(T.i, v);
            T.i += 2;
            return T;
        }

        public u32(v: number) {
            let T = this;
            T.c(4);
            T.s.setUint32(T.i, v);
            T.i += 4;
            return T;
        }

        public i8(v: number) {
            let T = this;
            T.c(1);
            T.s.setInt8(T.i++, v);
            return T;
        }

        public i16(v: number) {
            let T = this;
            T.c(2);
            T.s.setInt16(T.i, v);
            T.i += 2;
            return T;
        }

        public i32(v: number) {
            let T = this;
            T.c(4);
            T.s.setInt32(T.i, v);
            T.i += 4;
            return T;
        }

        public i64(v: bigint) {
			if(v>-0x8000000000000000 && v<0x8000000000000000){
			    let T = this;
                T.s.setBigInt64(T.i, v);
                T.i += 8;	
			}else{
				throw new Error("too large bigint");
			}
        }
        public u64(v: bigint) {
			if(v<0x10000000000000000){
			    let T = this;
                T.s.setBigUint64(T.i, v);
                T.i += 8;	
			}else{
				throw new Error("too large bigint");
			}
        }

        public process(n: number, f: (dataView: DataView, offset: number) => number) {
            this.c(n);
            this.i += f(this.s, this.i);
        }

        public float(v: number) {
            let T = this;
            T.c(4);
            T.s.setFloat32(T.i, v);
            T.i += 4;
            return T;
        }

        public double(v: number) {
            let T = this;
            T.c(8);
            T.s.setFloat64(T.i, v);
            T.i += 8;
            return T;
        }

        public bool(v: boolean) {
            this.i8(v ? 1 : 0);
            return this;
        }

        public utf8(v: string) {
            let T = this,
                b = Str.encode(v);
            T.u16(b.length);
            T.blob(b);
            return T;
        }

        public blob(v: Uint8Array) {
            let T = this;
            T.c(v.length);
            T.b.set(v, T.i);
            T.i += v.length;
            return T;
        }

        private c(n: number) {
            let T = this;
            if (T.i + n >= T.s.byteLength) {
                var tmp: Uint8Array = new Uint8Array(T.b.length + Math.max(this.incrCaplity, n));
                tmp.set(T.b);
                T.s = new DataView(tmp.buffer);
                T.b = tmp;
            }
        }

        public buffer(): ArrayBuffer {
            return this.s.buffer.slice(0, this.i);
        }

        public bin(): Uint8Array {
            return this.b.subarray(0, this.i);
        }
    }

    //输入流
    export class InStream {
        private i: number;
        private v: DataView;
        private b: Uint8Array;

        public constructor(d: ArrayBuffer) {
            this.i = 0;
            this.b = new Uint8Array(d);
            this.v = new DataView(d);
        }

        public i8(): number {
            return this.v.getInt8(this.i++);
        }

        public u8(): number {
            return this.v.getUint8(this.i++);
        }

        public i16(): number {
            let T = this,
                n = T.v.getInt16(T.i);
            T.i += 2;
            return n;
        }

        public u16(): number {
            let T = this,
                n = T.v.getUint16(T.i);
            T.i += 2;
            return n;
        }

        public i32(): number {
            let T = this,
                n = T.v.getInt32(T.i);
            T.i += 4;
            return n;
        }

        public u32(): number {
            let T = this,
                n = T.v.getUint32(T.i);
            T.i += 4;
            return n;
        }

        public i64() {
            let T = this,
                n = T.v.getBigInt64(T.i);
            T.i += 8;
            return n;
        }
        public u64() {
            let T = this,
                n = T.v.getBigUint64(T.i);
            T.i += 8;
            return n;
        }
        // public long(): number {
        //     if (ExtBigInt) {
        //         let vv = ExtBigInt.decodeX(this.bin(8));
        //         return ExtBigInt.isSafe(vv) ? ExtBigInt.toNumber(vv) : vv;
        //     }
        //     let T = this,
        //         h = T.v.getInt32(T.i),
        //         l = T.v.getInt32(T.i + 4);
        //     T.i += 8;
        //     return h * NM32 + (l >>> 0);
        // }

        public float(): number {
            let T = this,
                n = T.v.getFloat32(T.i);
            T.i += 4;
            return n;
        }

        public double(): number {
            let T = this,
                n = T.v.getFloat64(T.i);
            T.i += 8;
            return n;
        }

        public bool(): boolean {
            return this.i8() != 0;
        }

        public str(n: number): string {
            return n > 0 ? Str.decode(this.bin(n)) : "";
        }

        public utf8(): string {
            return Str.decode(this.bin(this.u16()));
        }

        public bin(size: number = 0): Uint8Array {
            let T = this, i = T.i;
            if (size < 1) {
                size = T.b.length - T.i;
            }
            T.i += size;
            return new Uint8Array(T.b.buffer.slice(i, T.i));
        }

    }

    export class Utf8Coder {
        public static encode(str: string): Uint8Array {
            let buf = new Uint8Array(str.length * 4), pos = 0,
                c1, // character 1
                c2; // character 2
            for (let i = 0; i < str.length; ++i) {
                c1 = str.charCodeAt(i);
                if (c1 < 128) {
                    buf[pos++] = c1;
                } else if (c1 < 2048) {
                    buf[pos++] = c1 >> 6 | 192;
                    buf[pos++] = c1 & 63 | 128;
                } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = str.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
                    c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
                    ++i;
                    buf[pos++] = c1 >> 18 | 240;
                    buf[pos++] = c1 >> 12 & 63 | 128;
                    buf[pos++] = c1 >> 6 & 63 | 128;
                    buf[pos++] = c1 & 63 | 128;
                } else {
                    buf[pos++] = c1 >> 12 | 224;
                    buf[pos++] = c1 >> 6 & 63 | 128;
                    buf[pos++] = c1 & 63 | 128;
                }
            }
            return buf.subarray(0, pos);
        }

        public static decode(buf: ArrayLike<number>) {
            let arr: number[] = [];
            for (let i = 0, j = 0; i < buf.length;) {
                let t = buf[i++];
                if (t <= 0x7F) {
                    arr[j++] = t;
                } else if (t >= 0xC0 && t < 0xE0) {
                    arr[j++] = (t & 0x1F) << 6 | buf[i++] & 0x3F;
                } else if (t >= 0xE0 && t < 0xF0) {
                    arr[j++] = (t & 0xF) << 12 | (buf[i++] & 0x3F) << 6 | buf[i++] & 0x3F;
                } else if (t >= 0xF0) {
                    let t2 = ((t & 7) << 18 | (buf[i++] & 0x3F) << 12 | (buf[i++] & 0x3F) << 6 | buf[i++] & 0x3F) - 0x10000;
                    arr[j++] = 0xD800 + (t2 >> 10);
                    arr[j++] = 0xDC00 + (t2 & 0x3FF);
                }
            }
            return String.fromCharCode.apply(String, arr);
        }
    }

    const NM32 = Math.pow(2, 32);
    let Ext: { encode?: (v: any, toBuf: OutStream) => OutStream, decode?: (type: number, fromBuf: InStream) => any } = {};
    let Str: { encode: (str: string) => Uint8Array, decode: (buf: ArrayLike<number>) => string } = Utf8Coder;
    let Opt: { float32: boolean, capInit?: number, capIncr?: number } = { float32: false, capInit: 256, capIncr: 256 }

    export function setOpt(opt: { float32: boolean, capInit?: number, capIncr?: number }) {
        Opt = { ...Opt, ...opt };
    }

    export function setExt(codec: { encode?: (v: any, toBuf: OutStream) => OutStream, decode?: (type: number, fromBuf: InStream) => any }) {
        Ext = codec || Ext;
    }

    export function setUtf8(codec: { encode: (str: string) => Uint8Array, decode: (buf: ArrayLike<number>) => string }) {
        Str = codec || Str;
    }

}