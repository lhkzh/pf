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

    encode(v: any, out: OutStream): void;
    decodeNegative(b: InStream): any;
    decodePositive(b: InStream): any;
}

export interface EncoderApi {
    encode(v: any, out: OutStream): OutStream;
    encodeArraySize(length: number, out: OutStream): void;
    encodeMapSize(length: number, out: OutStream): void;
    encodeExt(type: number, bin: Uint8Array, out: OutStream): void;
}

export interface DecoderApi {
    decode(b: InStream): any
    decodeMapSize(b: InStream): number
    decodeArraySize(b: InStream): number
}