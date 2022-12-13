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
        var millis = d.getTime(),//d * 1
            seconds = Math.floor(millis / 1000),
            nanos = (millis - seconds * 1000) * 1e6;
        if (nanos || seconds > 0xffffffff) {// Timestamp64
            var upperNanos = nanos * 4,
                upperSeconds = seconds / Math.pow(2, 32),
                upper = (upperNanos + upperSeconds) & 0xffffffff,
                lower = seconds & 0xffffffff;
            return out.bu(0xd7, 255).i32(upper).i32(lower);
        } else {// Timestamp32
            return out.bu(0xd6, 255).i32(Math.floor(millis / 1000));
        }
    }
    public decode(ins: InStream, len: number) {
        switch (len) {
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
            case 12:
                throw new Error('timestamp 96 is not yet implemented');
        }
    }

}