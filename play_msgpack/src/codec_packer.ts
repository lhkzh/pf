import { CodecExtApi, CodecLongApi } from "./codec_api";
import { jsNativeExtList } from "./codec_imp";
import { Decoder } from "./Decoder";
import { Encoder } from "./Encoder";
import { InStream } from "./InStream";
import { OutStream } from "./OutStream";
/**
 * @public
 */
export class MsgPacker {
    private _encoder: Encoder;
    private _decoder: Decoder;
    constructor(config?: { long?: CodecLongApi, extends?: Array<CodecExtApi>, floatAs32?: boolean, mapAsReal?: boolean, mapCheckIntKey?: boolean, mapKeepNilVal?: boolean, typedArrayToBytes?: boolean, throwIfUnknow?: boolean }) {
        this._encoder = new Encoder(config);
        this._decoder = new Decoder(config);
    }
    public get encoder() {
        return this._encoder;
    }
    public get decoder() {
        return this._decoder;
    }

    public pack(v: any, out?: OutStream): Uint8Array {
        return this._encoder.encode(v, out).bin();
    }
    public unpack(v: Uint8Array): any {
        return this._decoder.decode(new InStream(v, 0, v.length));
    }

    public encode(v: any, out: OutStream): OutStream {
        return this._encoder.encode(v, out);
    }
    public decode(v: InStream): any {
        return this._decoder.decode(v);
    }

    private static _def: MsgPacker;
    public static get Default(): MsgPacker {
        if (!this._def) {
            this._def = new MsgPacker();
        }
        return this._def;
    }
    private static _jsNative: MsgPacker;
    public static get JsNative(): MsgPacker {
        if (!this._jsNative) {
            this._jsNative = new MsgPacker({
                extends: jsNativeExtList.map(e => e)
            });
        }
        return this._jsNative;
    }
}
/**
 * @public
 */
export function pack(v: any): Uint8Array {
    return MsgPacker.Default.pack(v);
}
/**
 * @public
 */
export function unpack(v: Uint8Array): any {
    return MsgPacker.Default.unpack(v);
}
/**
 * @public
 */
export function packJs(v: any): Uint8Array {
    return MsgPacker.JsNative.pack(v);
}
/**
 * @public
 */
export function unpackJs(v: Uint8Array): any {
    return MsgPacker.JsNative.unpack(v);
}