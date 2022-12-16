<pre>
npm install play_msgpack
</pre>

<pre>
import {pack,unpack} from "play_msgpack";
console.log(unpack(pack({uid:321,score:88.5,name:"Tom",tags:[22,33,55]})));
</pre>


** if you use "jsbi" for bigint **
<pre>
import { Encoder, CodecLongApi, OutStream, InStream, MsgArray } from "play_msgpack";
const JSBI = require("jsbi");
MsgArray.SetCastInt64((v:any)=>{ return JSBI.BigInt(v); });
const jsbi_ext: CodecLongApi = {
    isImp(v: any): boolean {
        return v instanceof JSBI;
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

**with play_msg (schema)**
<pre>
import { pack, unpack } from "play_msgpack";
import { MsgArray, MType } from "play_msg";
@MsgArray.Meta({
    fields: [
        ["uid", MType.I53, 1],
        ["nick", MType.STR, 1],
        ["head", MType.STR, 0],
        ["age", MType.I8, 0],
        ["login", MType.DATE, 0],
        ["tags", ["Set", MType.I16], 0]
    ]
})
class User extends MsgArray {
    uid: number;
    nick: string;
    head: string;
    age: number;
    login: Date;
    tags: Set<number>
}

var u = new User();
u.uid = 123;
u.nick = "Jack";
u.head = "http://xxx.com/xxx.jpg";
u.age = 18;
u.tags = new Set([1, 9, 173]);

var arr = u.toArray();
console.log(JSON.stringify(arr, null, 2));
console.log(MsgArray.CastByArray.FromArray(User,arr));
console.log(MsgArray.CastByArray(User,<any[]>unpack(pack(arr))))
</pre>
