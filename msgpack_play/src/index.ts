import { Encoder } from "./Encoder";
import { Decoder } from "./Decoder";
import { InStream } from "./InStream";
import { OutStream } from "./OutStream";
import { CodecExtApi, CodecLongApi } from "./codec_ext_api";
import { MType, MsgArray } from "./MsgArray";

class MsgPacker {
    private _encoder: Encoder;
    private _decoder: Decoder;
    constructor(config?: { floatAs32?: boolean, mapAsReal?: boolean, long?: CodecLongApi, extends?: Array<CodecExtApi> }) {
        this._encoder = new Encoder(config);
        this._decoder = new Decoder(config);
    }
    public encode(v: any): Uint8Array {
        return this._encoder.encode(v).bin();
    }
    public decode(v: Uint8Array): any {
        return this._decoder.decode(new InStream(v.buffer));
    }
}

const _def = new MsgPacker();
function pack(v: any): Uint8Array {
    return _def.encode(v);
}
function unpack(v: Uint8Array): any {
    return _def.decode(v);
}
export {
    MsgPacker,
    Encoder,
    Decoder,
    InStream,
    OutStream,

    CodecExtApi,
    CodecLongApi,

    pack,
    unpack,

    MType,
    MsgArray,
}