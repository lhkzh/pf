import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

export interface CodecExtApi {
    isType(v: number): boolean;
    decode(ins: InStream, len: number): any;

    isImp(v): boolean;
    encode(v, out: OutStream, encoder: any): OutStream
}

export interface CodecLongApi {
    isImp(v): boolean;
    toAuto(v): any;
    encode(v, out: OutStream): OutStream;
    decodeNegative(b: InStream): any;
    decodePositive(b: InStream): any;
}