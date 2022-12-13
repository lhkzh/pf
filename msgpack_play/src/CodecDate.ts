import { CodecExtApi } from "./codec_ext_api";
import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

export class CodecDate implements CodecExtApi {
    public isImp(v: any) {
        return v instanceof Date;
    }
    public isType(v: number) {
        return v == -1;
    }
    public encode(d: Date, out: OutStream, encoder: any) {
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
    public decode(ins: InStream, len: number) {
        var seconds: number, nanoseconds: number;
        switch (len) {
            case 4:
                // timestamp 32 stores the number of seconds that have elapsed since 1970-01-01 00:00:00 UTC in an 32-bit unsigned integer
                seconds = ins.u32();
                nanoseconds = 0;
                break
            case 8:
                // Timestamp 64 stores the number of seconds and nanoseconds that have elapsed
                // since 1970-01-01 00:00:00 UTC in 32-bit unsigned integers, split 30/34 bits
                var upper = ins.u32(),
                    lower = ins.u32();
                nanoseconds = upper / 4,
                    seconds = ((upper & 0x03) * Math.pow(2, 32)) + lower // If we use bitwise operators, we get truncated to 32bits
                break
            case 12:
                throw new Error('timestamp 96 is not yet implemented');
        }
        return new Date((seconds * 1000) + Math.round(nanoseconds / 1E6))
    }

}