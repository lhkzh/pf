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
msgpack_int -> js:number/bigint   

for extends msg  
<pre>
import { MsgPacker, OutStream, InStream, CodecExtApi, DecoderApi, EncoderApi } from "play_msgpack";
class UserInfo {
    public constructor(public uid: number = 0, public nick: string = "") { }
}
class UserInfoPacker implements CodecExtApi {
    public get TYPE(): number { return 1; }
    public get CLASS() { return UserInfo; }

    public decode(ins: InStream, decoder: DecoderApi): UserInfo {
        if (decoder.isNil(ins)) {
            ins.skip();
            return null;
        }
        let r = new UserInfo();
        r.uid = Number(decoder.number(ins));
        r.nick = decoder.str(ins);
        return r;
    }
    encode(v: UserInfo, out: OutStream, encoder: EncoderApi): void {
        let tmp = new OutStream();
        encoder.number(v.uid, tmp);
        encoder.str(v.nick, tmp);
        encoder.ext(this.TYPE, tmp.bin(), out);
    }
}
let myPacker = new MsgPacker({ extends: [new UserInfoPacker()] });
console.log(myPacker.unpack(myPacker.pack(new UserInfo(323, "tom"))));
</pre>

if you use "jsbi" for bigint  
<pre>
import { MsgPacker, CodecLongApi, OutStream, InStream } from "play_msgpack";
const JSBI = require("jsbi");
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
let myPacker = new MsgPacker({ long: jsbi_ext });
console.log( myPacker.pack(JSBI.BigInt("234567897910")) );
</pre>

if you in ie11??
<pre>
<script>
<script src="https://unpkg.com/play_msgpack@latest/dist/index.umd_es5.js"></script>
if (!Uint8Array.prototype.slice) {
    Uint8Array.prototype.slice = function () {
        return new Uint8Array(this).subarray(this.arguments);
    }
}
if (!Number.isInteger) {
    function ToInteger (n) {
        var t = Number(n);
        return isNaN(t) ? 0 : 1 / t === Infinity || 1 / t == -Infinity || t === Infinity || t === -Infinity ? t : (t < 0 ? -1 : 1) * Math.floor(Math.abs(t))
    }
    Number.isInteger = function (n) {
        return "number" === typeof (n) && (!isNaN(n) && n !== Infinity && n !== -Infinity && ToInteger(n) === n);
    }
    Number.isSafeInteger = function e (r) {
        if ("number" !== typeof (r)) return !1;
        if (isNaN(r) || r === Infinity || r === -Infinity) return !1;
        var t = ToInteger(r);
        return t === r && Math.abs(t) <= Math.pow(2, 53) - 1
    }
}
</script>
</pre>