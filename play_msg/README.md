<pre>
npm install play_msg
</pre>

<pre>
import { MsgArray, MType } from "play_msg";
//import { pack, unpack } from "play_msgpack";
import { pack, unpack } from "msgpackr";

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
console.log(MsgArray.CastByArray(User,arr));
console.log(MsgArray.CastByArray(User,<any[]>unpack(pack(arr))));
</pre>