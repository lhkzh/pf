import { Str } from "./utf8";

//输入流
export class InStream {
    private i: number;
    private v: DataView;
    private b: Uint8Array;

    public constructor(d: Uint8Array, byteOffset?: number, byteLength?: number) {
        this.i = 0;
        this.b = d;
        this.v = new DataView(d.buffer, byteOffset, byteLength);
    }
    public get size() {
        return this.b.length;
    }
    public get less() {
        return this.b.length - this.i;
    }

    public see(): number {
        return this.v.getUint8(this.i);
    }
    public skip(n = 1) {
        this.i += n;
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

    public process(size: number) {
        let T = this;
        try {
            return new DataView(T.v.buffer, T.i, size);
        } finally {
            T.i += size;
        }
    }

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
        return Str.decode(this.sub(n));
    }

    public utf8(): string {
        return Str.decode(this.sub(this.u16()));
    }
    private terr() {
        throw new RangeError("Offset is outside");
    }
    public bin(size: number): Uint8Array {
        let T = this, i = T.i;
        T.i += size;
        if (T.i > T.b.length) {
            T.terr();
        }
        return T.b.slice(i, T.i);
    }
    public sub(size: number) {
        let T = this, i = T.i;
        T.i += size;
        if (T.i > T.b.length) {
            T.terr();
        }
        return T.b.subarray(i, T.i);
    }
    public child(size: number): InStream {
        let T = this, i = T.i;
        T.i += size;
        if (T.i > T.b.length) {
            T.terr();
        }
        return new InStream(T.b.subarray(i, T.i), i, size);
    }
    public src(): Uint8Array {
        return this.b;
    }
}