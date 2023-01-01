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