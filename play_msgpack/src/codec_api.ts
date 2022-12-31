import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

export type NewableType = { new(): any }
/**
 * @public
 */
export interface CodecExtApi {
    get TYPE(): number;
    get CLASS(): { new(): any };

    decode(ins: InStream, decoder: any): any;
    encode(v: any, out: OutStream, encoder: any): void
}
/**
 * @public
 */
export interface CodecLongApi {
    isImp(v: any): boolean;
    toAuto(v: any): any;
    toNumber(v: any): number;

    encode(v: any, out: OutStream): void;
    decodeNegative(b: InStream): any;
    decodePositive(b: InStream): any;
}

export interface EncoderApi {
    encode(v: any, out: OutStream): OutStream;

    map(v: Map<any, any>, out: OutStream): void;
    set(v: Set<any>, out: OutStream): void;

    ext(type: number, bin: Uint8Array, out: OutStream): void;
}

export interface DecoderApi {
    decode(b: InStream): any;

    map(b: InStream): Map<any, any>;
    set(b: InStream): Set<any>;
}