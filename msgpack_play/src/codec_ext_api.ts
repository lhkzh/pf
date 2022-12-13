import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

export interface CodecExtApi {
    isType(v: number): boolean;
    decode(ins: InStream, len: number): any;

    isImp(v: any): boolean;
    encode(v: any, out: OutStream, encoder: any): OutStream
}

export interface CodecLongApi {
    isImp(v: any): boolean;
    toAuto(v: any): any;
    encode(v: any, out: OutStream): OutStream;
    decodeNegative(b: InStream): any;
    decodePositive(b: InStream): any;
}