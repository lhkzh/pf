const assert=require("assert");
const test = require("test");
test.setup();

const Index=require("../dist/index");
const MsgArray=Index.MsgArray;
const MType=Index.MType;
const JsonX=Index.JsonX;
let TypeId=0;
describe("base", function(){
    
    it("base", function(){
        let Type=function(){};
        MsgArray.MetaBind(Type,TypeId++,TypeId.toString(), [
            ["online", MType.BOOL, 1],
            ["name", MType.STR, 1],
            ["id", MType.I53, 1],
            ["tm", MType.DATE, 1]
        ]);
        assert.equal(JsonX.Stringify(MsgArray.CastByArray(Type, [true,"Tom",10001,new Date(2022,06,06)])), '{"online":true,"name":"Tom","id":10001,"tm":"2022-07-05T16:00:00.000Z"}');
    });
    it("required", function(){
        let Type=function(){};
        MsgArray.MetaBind(Type,TypeId++,TypeId.toString(), [
            ["online", MType.BOOL, 0],
            ["name", MType.STR, 1]
        ]);
        assert.throws(()=>{
            MsgArray.CastByArray(Type, [true]);
        });
        assert.throws(()=>{
            MsgArray.CastByArray(Type, [true, 1]);
        });
    });
    it("option", function(){
        let Type=function(){};
        MsgArray.MetaBind(Type,TypeId++,TypeId.toString(), [
            ["online", MType.BOOL, 1],
            ["name", MType.STR, 0]
        ]);
        MsgArray.CastByArray(Type, [true]);
        MsgArray.CastByArray(Type, [false, "Tom"]);
        assert.throws(()=>{
            MsgArray.CastByArray(Type, [null, "abc"]);
        });
    });
    it("Int16Array", function(){
        let Type=function(){};
        MsgArray.MetaBind(Type,TypeId++,TypeId.toString(), [
            ["tags", Int16Array, 1]
        ]);
        let tmp = MsgArray.CastByArray(Type, [[2,3,-112,123]]);
        assert.deepEqual(tmp.tags, new Int16Array([2,3,-112,123]));
        assert.deepEqual(tmp.toArray(), [[2,3,-112,123]]);
        assert.strictEqual(tmp.toArray()[0].constructor, Int16Array);
        MsgArray.ConfigTypedArray(true);
        assert.strictEqual(tmp.toArray()[0].constructor, Array);
    });
    let t_jsonx_fn = function(d){
        let v = JsonX.Parse(JsonX.Stringify(d));
        
        if(d.constructor!=Map){
            assert.deepEqual(v,d);
        }else{
            var varr = [];
            v.forEach((iv, ik)=>{
                varr.push(iv,ik);
            });
            var darr = [];
            d.forEach((iv, ik)=>{
                darr.push(iv,ik);
            });
            assert.deepEqual(varr, darr);
        }
    };
    it("JsonX.Date", function(){
        t_jsonx_fn(new Date());
    });
    it("JsonX.Set", function(){
        let m = new Set([2,-1,3,"22","3",true,false,[5]])
        t_jsonx_fn(m);
    });
    it("JsonX.Map", function(){
        let m = new Map();
        m.set("aa",true);
        m.set(233.5,new Date());
        m.set({a:true,b:2},3);
        t_jsonx_fn(m);
    });
    it("JsonX.TypedArray", function(){
        t_jsonx_fn(new Int8Array(2,-1,-127));
        t_jsonx_fn(new Uint8Array(2,0,127));
        t_jsonx_fn(new Uint16Array(2,0,1279,31789));
        t_jsonx_fn(new Uint32Array(2,0,1279,31789,2**30));
    });
});

require.main === module && test.run(console.DEBUG);