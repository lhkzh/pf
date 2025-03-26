<pre>
npm install play_msg
</pre>

<pre>
import { MsgArray, MT, JsonX } from "play_msg";
import { pack, unpack } from "msgpackr";

@MsgArray.Meta({
  fields: [
    ["uid", MT.I53, 1],
    ["nick", MT.STR, 1],
    ["head", MT.STR, 0],
    ["age", MT.BYTE, 0],
    ["login", MT.DATE, 0],
    ["tags", [MT.SET, MT.SHORT], 0],
  ],
})
class User {
  uid: number;
  nick: string;
  head: string;
  age: number;
  login: Date;
  tags: Set<number>;
}

var u = new User();
u.uid = 123;
u.nick = "Jack";
u.head = "http://xxx.com/xxx.jpg";
u.age = 18;
u.tags = new Set([1, 9, 173]);

var arr = MsgArray.ToArray(u);
console.log(JsonX.Stringify(arr));
console.log(MsgArray.CastByArray(User, arr));
console.log(MsgArray.CastByArray(User, JsonX.Parse(JsonX.Stringify(arr))));
console.log(MsgArray.CastByArray(User, <any[]>unpack(pack(arr))));

// circle reference use : CastByRefArray/FromRefArray/ToRefArray

@MsgArray.Meta({
  fields: [
    ["id", MT.I53, 1],
    ["userList", [MT.ARR, User], 0],
    ["master", User, 0],
    ["link", Room, 0],
  ],
})
class Room extends MsgArray {
  id: number;
  userList: User[];
  master: User;
  link: Room;
}

let u01 = new User();
u01.uid = 101;
u01.nick = "Jim";
let u02 = new User();
u02.uid = 102;
u02.nick = "Jack";

let room = new Room();
room.id = 99;
room.userList = [u01, u02];
room.master = u02;
room.link = room;

console.log(
  MsgArray.CastByRefArray(Room, <any[]>unpack(pack(MsgArray.ToRefArray(room))))
);
console.log(
  Room.FromRefArray(JsonX.Parse(JsonX.Stringify(Room.ToRefArray(room))))
);

</pre>
