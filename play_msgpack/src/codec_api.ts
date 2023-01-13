import { InStream } from "./InStream";
import { OutStream } from "./OutStream";

export type NewableType = { new(): any }
/**
 * @public
 */
export interface CodecExtApi {
    get TYPE(): number;
    get CLASS(): { new(): any };

    decode(ins: InStream, decoder: DecoderApi): any;
    encode(v: any, out: OutStream, encoder: EncoderApi): void
}
/**
 * @public
 */
export interface CodecLongApi {
    isImp(v: any): boolean;
    toAuto(v: any): any;
    toNumber(v: any): number;
    toImp(v: any): any;

    encode(v: any, out: OutStream): void;
    decodeNegative(b: InStream): any;
    decodePositive(b: InStream): any;
}

export interface EncoderApi {
    encode(v: any, out: OutStream): OutStream;

    map(v: Map<any, any>, out: OutStream): void;
    set(v: Set<any>, out: OutStream): void;
    ext(type: number, bin: Uint8Array, out: OutStream): void;

    nil(out: OutStream): void;
    bool(v: boolean, out: OutStream): void;
    date(v: Date, out: OutStream): void;
    str(v: string, out: OutStream): void;
    number(v: number, out: OutStream): void;
    float(v: number, out: OutStream): void;
    int(v: number, out: OutStream): void;
    int64(v: number | bigint | any, out: OutStream): void;


    arrSize(length: number, out: OutStream): void;
    mapSize(length: number, out: OutStream): void;
    arr(v: ArrayLike<any>, out: OutStream): void;
    obj(v: any, out: OutStream): void;
    objFast(v: any, out: OutStream): void;

    bin(v: Uint8Array, out: OutStream): void;
    extHeader(type: number, length: number, out: OutStream): void;
    ext(type: number, bin: Uint8Array, out: OutStream): void;
}

export interface DecoderApi {
    isNil(b: InStream): boolean;
    decode(b: InStream): any;


    bool(b: InStream): boolean;
    number(b: InStream): number | bigint;
    str(b: InStream): string;
    bin(b: InStream): Uint8Array;
    date(b: InStream): Date;


    arrSize(b: InStream): number;
    mapSize(b: InStream): number;
    arrBy(b: InStream, count: number): any[];
    objBy(b: InStream, count: number, asRealMap?: boolean): { [index: string]: any } | { [index: number]: any } | Map<any, any>;
    obj(b: InStream): { [index: string]: any } | { [index: number]: any };
    map(b: InStream): Map<any, any>;
    arr(b: InStream): any[];
    set(b: InStream): Set<any>;
    ext(b: InStream, len: number, type: number): any;
}

export interface EncoderApiConfig {
    //if true typeArrayToRaw , if false toNomalArray(except Unit8Array) 
    typedArrayToBytes?: boolean,
    //the object check {[index:Number]:any}
    objCheckIntKey?: boolean,
    //the object skip null_value
    objKeepNilVal?: boolean,
    //true:encode float_number to float32, false to float64
    floatAs32?: boolean,
    long?: CodecLongApi,
    extends?: Array<CodecExtApi>,
    //if extends unsupport throw err,false=try as object(map)
    throwIfUnknow?: boolean
}

export interface DecoderApiConfig {
    //true= decode map to Map, false = decode map to Object
    mapAsReal?: boolean,
    long?: CodecLongApi,
    extends?: Array<CodecExtApi>,
    //if extends unsupport throw err,false=extends_binary
    throwIfUnknow?: boolean
}

export interface MsgpackerApiConfig extends EncoderApiConfig, DecoderApiConfig {

}