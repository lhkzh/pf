import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

export type NewableType = { new(): any }

export interface CodecExtApi {
    get TYPE(): number;
    get CLASS(): NewableType;

    decode(ins: InStream, decoder: any): any;
    encode(v: any, out: OutStream, encoder: any): void
}

export interface CodecLongApi {
    isImp(v: any): boolean;
    toAuto(v: any): any;

    encode(v: any, out: OutStream): void;
    decodeNegative(b: InStream): any;
    decodePositive(b: InStream): any;
}