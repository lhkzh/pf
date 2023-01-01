const assert=require("assert");
const test = require(process.versions.fibjs?"test":"node:test");
const {describe,it} = test;

describe("base", function(){
    const Index=require("../dist/index");
    
    it("nil", function(){
        assert.strictEqual(Index.unpack(Index.pack(null)), null);
        assert.strictEqual(Index.unpack(Index.pack(undefined)), null);
    });
    it("bool", function(){
        assert.strictEqual(Index.unpack(Index.pack(true)), true);
        assert.strictEqual(Index.unpack(Index.pack(false)), false);
    });
    it("number", function(){
        assert.equal(Number.isNaN(Index.unpack(Index.pack(NaN))), true);
        let t_fn = (n, notTypeEq)=>{
            let v = Index.unpack(Index.pack(n));
            if(notTypeEq){
                assert.equal(v, n);
            }else{
                assert.strictEqual(v, n);
            }
        };
        [0,-16,16, -36,36, -128,127,128, -0xffff,0xffff, 3.5,-3.5, Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER].forEach(t_fn);
        t_fn(BigInt(2**60));
        t_fn(-BigInt(2**60));
        t_fn(-3n, true);
        t_fn(3n, true);
    });
    it("string", function(){
        let t_fn = (n)=>{
            assert.strictEqual(Index.unpack(Index.pack(n)), n);
        };
        t_fn("");
        t_fn("abc");
        t_fn("01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567");
        t_fn("很好!。");
    });
    it("date", function(){
        var n=new Date();
        assert.strictEqual(Index.unpack(Index.pack(n)).getTime(), n.getTime());
        n=new Date(2022,01,01);
        assert.strictEqual(Index.unpack(Index.pack(n)).getTime(), n.getTime());
    });
    it("array", function(){
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)), n);
        };
        t_fn([]);
        var arr = [-1,23391,"balala",true,null,[-1024],{uid:-1001,age:98,flag:false,pi:0.315}];
        t_fn(arr);
        var tmp = new Array(5000);
        tmp.fill(-91,0,1000);
        tmp.fill(91,1000,2000);
        tmp.fill("heh哈",2000,3000);
        tmp.fill(new Date(),3000,4000);
        tmp.fill(false,4000,5000);
        arr = tmp.concat(arr);
        t_fn(arr);
    });
    it("obj", function(){
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)), n);
        };
        t_fn({});
        t_fn({"a":123.5,b:false});
        var tmp = {uid:321,score:88.5,name:"Tom",flag:true,tags:[22,33,55,false,1.2,"us"]};
        for(var i=0;i<512;i++){
            tmp[i]=i;
            tmp["pauhgphaphgpahpgAH7TR0YQ0YT07QY0T7YHPZHPZHPZHJGPHAPGNP[AIJGPJtmpshfpuahpghpahgpahpghpauhgpahpguhpahgphapghpauhgphaphgpahpgAH7TR0YQ0YT07QY0T7YHPZHPZHPZHJGPHAPGNP[AIJGPJAPGIJ"+i]=i;
        }
        t_fn(tmp);
    });
    it("vmap", function(){
        let t_fn = (n,v)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)),v);
        };
        t_fn(new Map([[23,"233"],["abc",456]]), {23:"233", abc:456});
        var tmp = {},tm2=new Map();
        for(var i=9000;i<10000;i++){
            tmp[i] = i;
            tm2.set(i,i);
            tmp[i.toString(36)]=i;
            tm2.set(i.toString(36),i);
        }
        t_fn(tm2,tmp);
    });
    it("vset", function(){
        let t_fn = (n,v)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)),v);
        };
        t_fn(new Set([2,3,5]), [2,3,5]);
        var tarr = [],tset=new Set();
        for(var i=9000;i<10000;i++){
            tarr.push(i);
            tset.add(i);
            tarr.push(i.toString(36));
            tset.add(i.toString(36));
        }
        t_fn(tset,tarr);
    });
    it("vBuffer", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Uint8Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(Buffer.from([]));
        let arr=[];for(let i=0;i<256;i++) arr.push(i);
        t_fn(Buffer.from(arr));
        t_fn(Buffer.from([...arr,...arr,...arr,...arr]));
    });
    it("Uint8Array", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, n.constructor);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Uint8Array([]));
        let arr=[];for(let i=0;i<256;i++) arr.push(i);
        t_fn(new Uint8Array(arr));
        t_fn(new Uint8Array([...arr,...arr,...arr]));
    });
    it("vInt8Array", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Int8Array([]));
        let arr=[];for(let i=0;i<256;i++) arr.push(i);
        t_fn(new Int8Array(arr));
        t_fn(new Int8Array([...arr,...arr,...arr]));
    });
    it("vInt16Array", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Int16Array([]));
        let arr=[];for(let i=-2560;i<2560;i+=10) arr.push(i);
        t_fn(new Int16Array(arr));
        t_fn(new Int16Array([...arr,...arr,...arr]));
    });
    it("vUint16Array", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Uint16Array([]));
        let arr=[];for(let i=0;i<2560;i+=10) arr.push(i);
        t_fn(new Uint16Array(arr));
        t_fn(new Uint16Array([...arr,...arr,...arr]));
    });
    it("vInt32Array", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Int32Array([]));
        let arr=[-2147483646,2147483646];for(let i=-2560;i<2560;i+=10) arr.push(i);
        t_fn(new Int32Array(arr));
        t_fn(new Int32Array([...arr,...arr,...arr]));
    });
    it("vUint32Array", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Uint32Array([]));
        let arr=[2147483646];for(let i=0;i<2560;i+=10) arr.push(i);
        t_fn(new Uint32Array(arr));
        t_fn(new Uint32Array([...arr,...arr,...arr]));
    });
    it("vFloatArray", function(){
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            for(let i=0;i<n.length;i++) assert.strictEqual(v[i], n[i]);
        };
        t_fn(new Float32Array([]));
        let arr=[];for(let i=0;i<1280;i++) arr.push(i+0.5,0.5-i);
        t_fn(new Float32Array(arr));
        t_fn(new Float64Array([...arr,...arr,...arr]));
    });
    it('BigInt64Array/BigUint64Array', () => {
        let t_fn = (n)=>{
            let v = Index.unpack(Index.pack(n));
            assert.strictEqual(v.constructor, Array);
            assert.strictEqual(v.length, n.length);
            for(var i=0;i<v.length;i++){
                assert.strictEqual(v[i]==n[i], true);
            }
        };
        t_fn(new BigInt64Array([2306n,123n,0n,-25515621n,9007199254740991n,-9007199254740991n,2305843009213694039n,-2305843009213694039n]));
        t_fn(new BigUint64Array([2306n,123n,0n,25515621n,9007199254740991n,-9007199254740991n,2305843009213694039n,2905843009213694039n]));
    });
    it("unknow", function(){
        let MyMsgpack_throw = new Index.MsgPacker({throwIfUnknow:true});
        let MyTmpObj = function(){};
        let tmpVo = new MyTmpObj();
        tmpVo.uid = 323;
        tmpVo.flag = true;
        tmpVo.desc = "balihp😇大家好 🦸‍♂️";
        assert.throws(function(){
            MyMsgpack_throw.pack(tmpVo);
        });
        
        let MyMsgpack_try = new Index.MsgPacker({throwIfUnknow:false});
        assert.deepEqual(MyMsgpack_try.unpack(MyMsgpack_try.pack(tmpVo)), tmpVo);
    });

    if(process.versions.fibjs){
        let xfn = (d)=>{
            assert.deepEqual(require("msgpack").encode(d), Buffer.from(Index.pack(d)));
        };
        it("x-number", function(){
            [0,8,-8,16,-16,32,-32,2**15-1,2**15,-(2**15),0xffff,-0xffff,
                2**31,-(2**31),
                9007199254740991n,-9007199254740991n,
                2**60,-(2**60)
            ].forEach(n=>xfn(n));
        });
        it("x-bool", function(){
            xfn(true);
            xfn(false);
        });
        it("x-str", function(){
            xfn("");
            xfn(new Array(16).fill("1").join(""));
            xfn(new Array(0xff).fill("1").join(""));
            xfn(new Array(0xffff).fill("1").join(""));
            xfn(new Array(0xfffff).fill("大😇👽 🦸‍♂️").join(""));
        });
        it("x-date", function(){
            xfn(new Date());
            xfn(new Date(2020,1,1));
        });
        it("x-obj", function(){
            let newObj = (n)=>{
                var r={};
                for(var i=0;i<n;i++){
                    r["t"+i]=i;
                }
                return r;
            };
            xfn(newObj(8));
            xfn(newObj(16));
            xfn(newObj(0xfff));
            xfn(newObj(0xffff));
            xfn(newObj(0xfffff));
        });
        it("x-arr", function(){
            let newArr = (n)=>{
                return new Array(n).fill(n);
            };
            xfn(newArr(8));
            xfn(newArr(16));
            xfn(newArr(0xfff));
            xfn(newArr(0xffff));
            xfn(newArr(0xfffff));
        });
    }
});

describe('jsNative', () => {
    const Index=require("../dist/index");
    let tt_fn = (n)=>{
        let v = Index.unpackJs(Index.packJs(n));
        assert.strictEqual(v.constructor, n.constructor);
        assert.deepEqual(v,n);
    };
    it('Buffer', () => {
        tt_fn(Buffer.from([2,3,5,123,0,255]));
        tt_fn(Buffer.from("天气真好！..."));
    });
    it('Map', () => {
        tt_fn(new Map([[23,"233"],["abc",456],[-213,true]]));
    });
    it('Set', () => {
        tt_fn(new Set([231,-21,3169,true,false]));
    });
    it('Int8Array', () => {
        tt_fn(new Int8Array([2,3,5,-123]));
    });
    it('Uint8Array', () => {
        tt_fn(new Uint8Array([2,3,5,123,0,255]));
    });
    it('Int16Array', () => {
        tt_fn(new Int16Array([-125,2306,123,0,-255]));
    });
    it('Uint16Array', () => {
        tt_fn(new Uint16Array([2306,123,0,255]));
    });
    it('Int32Array', () => {
        tt_fn(new Int32Array([-125,2306,123,0,-25515621]));
    });
    it('Uint32Array', () => {
        tt_fn(new Uint32Array([2306,123,0,25515621]));
    });
    it('Float32Array', () => {
        tt_fn(new Float32Array([-125.5,2306.2]));
    });
    it('Float64Array', () => {
        tt_fn(new Float64Array([-125.5,2306.2]));
    });
    it('BigInt64Array', () => {
        tt_fn(new BigInt64Array([2306n,123n,0n,-25515621n,2305843009213694039n,-2305843009213694039n]));
    });
    it('BigUint64Array', () => {
        tt_fn(new BigUint64Array([2306n,123n,0n,25515621n,2305843009213694039n,2905843009213694039n]));
    });

    it('BigInt', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.strictEqual(vv,n);
            assert.strictEqual(typeof(vv),typeof(n));
        };
        t_fn(BigInt(0));
        t_fn(BigInt(-1));
        t_fn(BigInt(1));
        t_fn(BigInt(2**60));
        t_fn(2305843009213694039n);
        t_fn(-2305843009213694039n);
    });
});
if(process.versions.fibjs){//fibjs
    test.run(console.DEBUG);
}else{//nodejs
    test();
}