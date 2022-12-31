<pre>
npm install play_msgpack
</pre>

<pre>
import {pack,unpack} from "play_msgpack";
console.log(unpack(pack({uid:321,score:88.5,name:"Tom",tags:[22,33,55]})));
</pre>

packJs/unpackJs : js_native_local_ext  
<pre>
import {packJs,unpackJs} from "play_msgpack";
console.log(unpackJs(packJs({uid:321,score:88.5,name:"Tom",tags:[22,33,55],msg:new Set([2,3,5]),lgx:new Int16Array([-2,3,5])})));
</pre>

pack/unpack : default  
js:number(float/double) -> msgpack_double  
js:number(int) -> msgpack_int(auto)  
js:bigint -> msgpack_int(auto)  
js:Uint8Array -> msgpack_raw  
js:TypedArray -> msgpack_array  
js:Set -> msgpack_array  
js:Map -> msgpack_map  
msgpack_map -> js:Object(kv)  
msgpack_array -> js:array  


if you use "jsbi" for bigint  
<pre>
import { Encoder, CodecLongApi, OutStream, InStream, MsgArray } from "play_msgpack";
const JSBI = require("jsbi");
MsgArray.SetCastInt64((v:any)=>{ return JSBI.BigInt(v); });
const jsbi_ext: CodecLongApi = {
    isImp(v: any): boolean {
        return v instanceof JSBI;
    },
    toNumber(v: any): number{
        return JSBI.toNumber(JSBI.BigInt(v));
    },
    toAuto(v: any): any {
        let x = JSBI.BigInt(v);
        let n = JSBI.toNumber(x);
        return Number.isSafeInteger(n) ? n : JSBI;
    },
    encode(v: any, out: OutStream): OutStream {
        let x = JSBI.BigInt(v);
        out.process(8, (dv: DataView, offset: number) => {
            if (JSBI.lessThan(x, JSBI.BigInt('0'))) {
                JSBI.DataViewSetBigInt64(dv, offset, x);
            } else {
                JSBI.DataViewSetBigUint64(dv, offset, x);
            }
        });
        return out;
    },
    decodeNegative(b: InStream) {
        return JSBI.DataViewGetBigInt64(b.process(8), 0);
    },
    decodePositive(b: InStream) {
        return JSBI.DataViewGetBigUint64(b.process(8), 0);
    }
};
let jsbi_encoder = new Encoder({ long: jsbi_ext });
console.log(jsbi_encoder.encode(JSBI.BigInt("2345678979")).bin());
</pre>