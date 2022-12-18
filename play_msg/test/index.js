const assert=require("assert");
const test = require("test");
test.setup();

const Index=require("../dist/index");
const MsgArray=Index.MsgArray;
const MType=Index.MType;
let TypeId=0;
describe("base", function(){
    
    it("base", function(){
        let Type=function(){};
        MsgArray.MetaBind(Type,TypeId++,TypeId.toString(), [
            ["online", MType.BOOL, 1],
            ["name", MType.STR, 1],
            ["id", MType.I53, 1]
        ]);
        assert.equal(MsgArray.Stringify(MsgArray.CastByArray(Type, [true,"Tom",10001])), '{"online":true,"name":"Tom","id":10001}')
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
});

require.main === module && test.run(console.DEBUG);