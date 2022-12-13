import { Str } from "./utf8";

//输出流
export class OutStream {
    private b: Uint8Array;
    private s: DataView;
    private i: number;

    public constructor(private initCaplity: number = 512, private incrCaplity: number = 1024) {
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
        let T = this;
        T.s.setBigInt64(T.i, v);
        T.i += 8;
    }
    public u64(v: bigint) {
        let T = this;
        T.s.setBigUint64(T.i, v);
        T.i += 8;
    }

    public process(size: number, f: (dataView: DataView, offset: number) => void) {
        let T = this;
        T.c(size);
        f(T.s, T.i);
        T.i += size;
        return T;
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
