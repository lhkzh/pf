const assert = require("assert");
const test = require(process.versions.fibjs ? "test" : "node:test");
const { describe, it } = test;

const Index = require("../dist/index");
const MsgArray = Index.MsgArray;
const MT = Index.MT;
const JsonX = Index.JsonX;
let TypeId = 0;
describe("base", function () {
  it("base", function () {
    let Type = function () {};
    MsgArray.MetaBind(Type, TypeId++, TypeId.toString(), [
      ["online", MT.BOOL, 1],
      ["name", MT.STR, 1],
      ["id", MT.I53, 1],
      ["tm", MT.DATE, 1],
    ]);
    assert.equal(
      JsonX.Stringify(
        MsgArray.CastByArray(Type, [true, "Tom", 10001, new Date(2022, 06, 06)])
      ),
      '{"online":true,"name":"Tom","id":10001,"tm":"2022-07-05T16:00:00.000Z"}'
    );
  });
  it("required", function () {
    let Type = function () {};
    MsgArray.MetaBind(Type, TypeId++, TypeId.toString(), [
      ["online", MT.BOOL, 0],
      ["name", MT.STR, 1],
    ]);
    assert.throws(() => {
      MsgArray.CastByArray(Type, [true]);
    });
    assert.throws(() => {
      MsgArray.CastByArray(Type, [true, 1]);
    });
  });
  it("option", function () {
    let Type = function () {};
    MsgArray.MetaBind(Type, TypeId++, TypeId.toString(), [
      ["online", MT.BOOL, 1],
      ["name", MT.STR, 0],
    ]);
    MsgArray.CastByArray(Type, [true]);
    MsgArray.CastByArray(Type, [false, "Tom"]);
    assert.throws(() => {
      MsgArray.CastByArray(Type, [null, "abc"]);
    });
  });
  it("circle_reference", function () {
    let Player = function () {};
    // let Room=function(){};
    // let _player_uuid=0;
    // class Player{
    //     constructor(){
    //         this._uuid = _player_uuid++;
    //     }
    // }
    class Room extends MsgArray {}
    MsgArray.MetaBind(Room, TypeId++, "Room" + TypeId.toString(), [
      ["rid", MT.INT, 1],
      ["desc", MT.STR, 1],
      ["players", [MT.ARR, Player], 1],
      ["master", Player, 0],
      ["map", [MT.OBJ, MT.STR, Player], 0],
      ["other", [MT.OBJ, MT.STR, Player], 0],
      ["set1", [MT.SET, MT.INT], 0],
      ["set2", [MT.SET, MT.INT], 0],
    ]);
    MsgArray.MetaBind(Player, TypeId++, "Player" + TypeId.toString(), [
      ["name", MT.STR, 1],
      ["next", Player, 0],
    ]);
    let newP = function (pid) {
      let p = new Player();
      p.name = "n" + pid;
      p.next = null;
      return p;
    };
    let p1 = new Player();
    p1.name = "Tom-P1";
    let p2 = new Player();
    p2.name = "Jerry-P2";
    p2.next = p1;
    p1.next = p2;
    let p3 = new Player();
    p3.name = "Sanndy-P3";
    p3.next = null;
    assert.throws(function () {
      MsgArray.ToArray(p2);
    });

    let room = new Room();
    room.rid = 100;
    room.desc = "test";
    room.players = [p1, p2, p3];
    room.master = p1;
    room.map = { p1: p1, p2: p2, p3: p3 };
    room.other = room.map;
    room.set1 = new Set([2, 3, 5]);
    room.set2 = room.set1;
    for (let i = 0; i < 40; i++) {
      let ip = newP(i);
      room.players.unshift(ip);
      room.map[ip.name] = ip;
    }
    assert.throws(function () {
      MsgArray.ToArray(room);
    });
    let roomArr = Room.ToRefArray(room);
    let roomDecode = Room.FromRefArray(JsonX.Parse(JsonX.Stringify(roomArr)));
    assert.equal(roomDecode.map.p2.next.name, p1.name);
    assert.deepEqual(roomDecode.map.p2.next, p1);
    assert.deepEqual(
      roomDecode.players.find((e) => e.name == p3.name),
      p3
    );
    assert.equal(
      roomDecode.players.find((e) => e.name == p3.name) === roomDecode.map.p3,
      true
    );
    assert.deepEqual(
      JSON.stringify(Room.ToRefArray(roomDecode)),
      JSON.stringify(roomArr)
    );

    let roomD2 = MsgArray.CastByRefArray(
      Room,
      JsonX.Parse(JsonX.Stringify(MsgArray.ToRefArray(room)))
    );
    assert.deepEqual(Room.ToRefArray(roomD2), roomArr);
    // console.warn(roomArr);
    // console.warn(roomD2.toString());
  });
  it("Int16Array", function () {
    let Type = function () {};
    MsgArray.MetaBind(Type, TypeId++, TypeId.toString(), [
      ["tags", Int16Array, 1],
    ]);
    let tmp = MsgArray.CastByArray(Type, [[2, 3, -112, 123]]);
    assert.deepEqual(tmp.tags, new Int16Array([2, 3, -112, 123]));
    assert.deepEqual(MsgArray.ToArray(tmp), [
      new Int16Array([2, 3, -112, 123]),
    ]);
    assert.strictEqual(MsgArray.ToArray(tmp)[0].constructor, Int16Array);
    MsgArray.OptionTypedArray(true);
    assert.strictEqual(MsgArray.ToArray(tmp)[0].constructor, Array);
  });
  let t_jsonx_fn = function (d) {
    let v = JsonX.Parse(JsonX.Stringify(d));

    if (d.constructor != Map) {
      assert.deepEqual(v, d);
    } else {
      var varr = [];
      v.forEach((iv, ik) => {
        varr.push(iv, ik);
      });
      var darr = [];
      d.forEach((iv, ik) => {
        darr.push(iv, ik);
      });
      assert.deepEqual(varr, darr);
    }
  };
  it("MT.Base", function () {
    let d = {
      a: "aA.3",
      b: 33.5,
      c: false,
      d: {
        nick: "lala",
        sex: 1,
        age: 18,
        f: null,
        tags: [2, 3, 5, 11, null, true],
      },
    };
    let v = JsonX.Parse(JsonX.Stringify(d));
    assert.deepEqual(v, d);
  });
  it("MT.Date", function () {
    let d = new Date();
    let v = JsonX.Parse(JsonX.Stringify(d));
    assert.deepEqual(v, d);
  });
  it("MT.Set", function () {
    let d = new Set([2, -1, 3, "22", "3", true, false, [5]]);
    let v = JsonX.Parse(JsonX.Stringify(d));
    assert.strictEqual(v.constructor, d.constructor);
    assert.strictEqual(v.size, d.size);
    assert.strictEqual(JsonX.Stringify(d), JsonX.Stringify(v));
    t_jsonx_fn(d);
  });
  it("MT.Map", function () {
    let m = new Map();
    m.set("aa", true);
    m.set(233.5, new Date());
    m.set({ a: true, b: 2 }, 3);
    t_jsonx_fn(m);
  });
  it("MT.TypedArray", function () {
    t_jsonx_fn(new Int8Array(2, -1, -127));
    t_jsonx_fn(new Uint8Array(2, 0, 127));
    t_jsonx_fn(new Uint16Array(2, 0, 1279, 31789));
    t_jsonx_fn(new Uint32Array(2, 0, 1279, 31789, 2 ** 30));
  });
});

if (process.versions.fibjs) {
  //fibjs
  test.run(console.DEBUG);
} else {
  //nodejs
  test();
}
