import { CodecLongApi } from "./codec_ext_api";
import { InStream } from "./InStream";
import { OutStream } from "./OutStream";


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
    public encode(v: any, out: OutStream) {
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