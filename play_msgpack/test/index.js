const assert=require("assert");
const test = require("test");
test.setup();

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
        assert.deepEqual(Index.unpack(Index.pack(n)).getTime(), n.getTime());
        n=new Date(2022,01,01);
        assert.strictEqual(Index.unpack(Index.pack(n)).getTime(), n.getTime());
    });
    it("array", function(){
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)), n);
        };
        t_fn([]);
        var arr = [-1,23391,"balala",true,null,[-1024]];
        t_fn(arr);
        for(var i=0;i<10000;i++){
            arr.push(i);
        }
        t_fn(arr);
    });
    it("obj", function(){
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)), n);
        };
        t_fn({});
        t_fn({"a":123.5,b:false});
    });
    it("vmap", function(){
        let t_fn = (n,v)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)),v);
        };
        t_fn(new Map([[23,"233"],["abc",456]]), {23:"233", abc:456});
    });
    it("vset", function(){
        let t_fn = (n,v)=>{
            assert.deepEqual(Index.unpack(Index.pack(n)),v);
        };
        t_fn(new Set([2,3,5]), [2,3,5]);
    });
});

describe('jsNative', () => {
    const Index=require("../dist/index");
    it('Map', () => {
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpackJs(Index.packJs(n)),n);
        };
        t_fn(new Map([[23,"233"],["abc",456],[-213,true]]));
    });
    it('Set', () => {
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpackJs(Index.packJs(n)),n);
        };
        t_fn(new Set([231,-21,3169,true,false]));
    });
    it('Int8Array', () => {
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpackJs(Index.packJs(n)),n);
        };
        t_fn(new Int8Array([2,3,5,-123]));
    });
    it('Uint8Array', () => {
        let t_fn = (n)=>{
            assert.deepEqual(Index.unpackJs(Index.packJs(n)),n);
        };
        t_fn(new Uint8Array([2,3,5,123,0,255]));
    });
    it('Int16Array', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.deepEqual(vv,n);
        };
        t_fn(new Int16Array([-125,2306,123,0,-255]));
    });
    it('Uint16Array', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.deepEqual(vv,n);
        };
        t_fn(new Uint16Array([2306,123,0,255]));
    });
    it('Int32Array', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.deepEqual(vv,n);
        };
        t_fn(new Int32Array([-125,2306,123,0,-25515621]));
    });
    it('Uint32Array', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.deepEqual(vv,n);
        };
        t_fn(new Uint32Array([2306,123,0,25515621]));
    });
    it('Float32Array', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.deepEqual(vv,n);
        };
        t_fn(new Float32Array([-125.5,2306.2]));
    });
    it('Float64Array', () => {
        let t_fn = (n)=>{
            var vv = Index.unpackJs(Index.packJs(n));
            assert.deepEqual(vv,n);
        };
        t_fn(new Float64Array([-125.5,2306.2]));
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
    });
});
require.main === module && test.run(console.DEBUG);