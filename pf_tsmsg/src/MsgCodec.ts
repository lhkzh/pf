import { MsgPack } from "./MsgPack";
import OutStream = MsgPack.OutStream;
import InStream = MsgPack.InStream;
import packBool = MsgPack.packBool;
import packInt = MsgPack.packInt;
import packBigInt = MsgPack.packBigInt;
import packDate = MsgPack.packDate;
import packString = MsgPack.packString;
import packArrHeader = MsgPack.packArrHeader;
import packObjHeader = MsgPack.packObjHeader;
import packNative = MsgPack.packNative;
import packExt = MsgPack.packExt;
import packNil = MsgPack.packNil;
import unpackExt = MsgPack.unpackExt;
import unpackStr = MsgPack.unpackStr;
import packArray = MsgPack.packArray;

import unpack = MsgPack.unpack;
import isInt = MsgPack.isInt;
import isLong = MsgPack.isLong;
import toLong = MsgPack.toLong;
import toN53 = MsgPack.toN53;

export class MsgCodec {
    private encs: any = {};
    private decs: any = {};
    private ids: any = {};
    private sdi: any = {};
    private enci = new Map();
    private deci = new Map();
    private protocols: any;
    private initCap: number;
    private incrCap: number;

    constructor(cfg: { options: { initCap?: number, incrCap?: number }, protocols: { [index: string]: any } }) {
        this.encs = {};
        this.decs = {};
        this.protocols = cfg.protocols;
        this.initCap = cfg.options && cfg.options.initCap > 0 ? cfg.options.initCap : 256;
        this.incrCap = cfg.options && cfg.options.incrCap > 0 ? cfg.options.incrCap : 256;
        for (var k in this.protocols) {
            var v = this.protocols[k];
            if (typeof v != "string") {
                this.ids[v.id] = k;
                this.sdi[k] = v.id;
                this.encs[k] = this.buildEncFn(k, v);
                this.decs[k] = this.buildDecFn(k, v);
                this.enci.set(v.id, this.encs[k]);
                this.deci.set(v.id, this.decs[k]);
                link_x_codec(k, this.encs, this.decs);
            }
        }
    }

    public id2name(id: number): string {
        return this.ids[id];
    }
    public name2id(name: string): number {
        return this.sdi[name] || NaN;
    }

    public encode(type: string, data: any, out?: OutStream): OutStream {
        return this.encs[type](data, out || new OutStream(this.initCap, this.incrCap));
    }

    public decode(type: string, val: Uint8Array | InStream): any {
        return this.decs[type](val instanceof InStream ? val : new InStream(val.buffer), false);
    }

    public encodeX(id: number, data: any, out?: OutStream): OutStream {
        return this.enci.get(id)(data, out || new OutStream(this.initCap, this.incrCap));
    }
    public decodeX(id: number, val: Uint8Array | InStream): any {
        return this.deci.get(id)(val instanceof InStream ? val : new InStream(val.buffer), false);
    }

    private buildDecFn(clazz: string, info: any) {
        let members = info.members;

        if (members.length == 1 && members[0][2] == 2) {//index_kv
            let vType = this.getLinkType(members[0][1]);
            const keyFn: any = members[0][0] == "string" ? dstr : decodeInt;
            const valFn = decodeFnDict.hasOwnProperty(vType) ? decodeFnDict[vType] : this.getStructLinkDecFn(vType);
            return function (input: InStream, option: boolean) {
                decode_at(clazz, "");
                let rsp: any = dObj(input, option, keyFn, valFn, true);
                return rsp;
            }
        } else {
            let fns: Array<(input: InStream, option?: boolean) => any> = [], fnn: number = 0;
            for (var node of members) {
                //key = node[0], val=node[1], option=node[2]
                fns.push(this.getStructFieldDecFn(node[0], node[1]));
                if (node[2] == 0) {
                    fnn++;
                }
            }
            return function (input: InStream, option: boolean) {
                decode_at(clazz, "");
                var len = dArrLen(input, option);
                if (len >= 0) {
                    var rsp: any = {};
                    if (len == members.length) {
                        for (var i = 0; i < len; i++) {
                            decode_at(clazz, members[i][0]);
                            rsp[members[i][0]] = fns[i](input, members[i][2] == 1);
                        }
                    } else if (len > members.length) {
                        for (var i = 0; i < members.length; i++) {
                            decode_at(clazz, members[i][0]);
                            rsp[members[i][0]] = fns[i](input, members[i][2] == 1);
                        }
                        for (i = members.length; i < len; i++) {
                            MsgPack.decode2(input);
                        }
                    } else if (len < fnn) {
                        throw new Error(`decode_fail:members match fail@${clazz}`);
                    } else {
                        for (var i = 0; i < members.length; i++) {
                            if (i >= len) {
                                if (members[i][2] == 0) {
                                    throw new Error(`decode_fail:members match fail@${clazz}`);
                                }
                                rsp[members[i][0]] = undefined;
                            } else {
                                decode_at(clazz, members[i][0]);
                                rsp[members[i][0]] = fns[i](input, members[i][2] == 1);
                            }
                        }
                    }
                    return rsp;
                }
                return undefined;
            }
        }
    }

    private buildEncFn(clazz: string, info: any) {
        let members = info.members;
        if (members.length == 1 && members[0][2] == 2) {//index_kv
            let vType = this.getLinkType(members[0][1]);
            const keyFn: any = members[0][0] == "string" ? estr : ekv_key_int;
            const valFn = encodeFnDict.hasOwnProperty(vType) ? encodeFnDict[vType] : this.getStructLinkEncFn(vType);
            return function (v: any, out: OutStream) {
                eObj(v, out, keyFn, valFn);
                return out;
            }
        } else {
            let fns: Array<(v: any, out: OutStream) => OutStream> = [];
            for (var node of members) {
                //key = node[0], val=node[1], option=node[2]
                fns.push(this.getStructFieldEncFn(node[0], node[1]));
            }
            return function (v: any, out: OutStream) {
                if (isNilOrUndefiend(v)) {
                    packNil(out);
                } else {
                    packArrHeader(members.length, out);
                    for (var fn of fns) {
                        fn(v, out);
                    }
                }
                return out;
            }
        }
    }

    private getStructFieldEncFn(p: string, t: string | any[]): (v: any, out: OutStream) => OutStream {
        let self = this;
        let fn: (v: any, out: OutStream) => OutStream;
        if (encodeFnDict.hasOwnProperty(t.toString())) {
            fn = encodeFnDict[t.toString()];
        } else if (self.encs.hasOwnProperty(t.toString())) {
            fn = self.encs[t.toString()];
        } else if (self.protocols.hasOwnProperty(t.toString())) {
            return self.getStructFieldEncFn(p, self.protocols[t.toString()]);
        } else {
            fn = self.getStructLinkEncFn(t);
        }
        return function (v: any, out: OutStream) {
            return fn(v[p], out);
        }
    }

    private getStructLinkEncFn(t: string | any[]) {
        let self = this;
        if (Array.isArray(t)) {
            return this.buildEncFn("", { members: t });
        }
        return function (v: any, out: OutStream) {
            return self.encs[t.toString()](v, out);
        }
    }

    private getStructFieldDecFn(p: string, t: string | any): (input: InStream, option?: boolean) => InStream {
        let self = this;
        let fn: (input: InStream, option?: boolean) => any;
        if (decodeFnDict.hasOwnProperty(t.toString())) {
            fn = decodeFnDict[t.toString()];
        } else if (self.decs.hasOwnProperty(t.toString())) {
            fn = self.decs[t.toString()];
        } else if (self.protocols.hasOwnProperty(t.toString())) {
            return self.getStructFieldDecFn(p, self.protocols[t.toString()]);
        } else {
            fn = self.getStructLinkDecFn(t);
        }
        return function (input: InStream, option?: boolean) {
            return fn(input, option);
        }
    }

    private getStructLinkDecFn(t: string) {
        let self = this;
        if (Array.isArray(t)) {
            return this.buildDecFn("", { members: t });
        }
        return function (input: InStream, option?: boolean) {
            return self.decs[t](input, option);
        }
    }

    private getLinkType(s: string): string {
        if (this.protocols.hasOwnProperty(s)) {
            let v = this.protocols[s];
            if (typeof v == "string") {
                return this.getLinkType(v);
            }
            return s;
        }
        if (encodeFnDict.hasOwnProperty(s)) {
            return s;
        }
        return s;
    }
}

const gTypeArr = ["Int8Array", "Int16Array", "Int32Array", "Uint8Array", "Uint16Array", "Uint32Array", "Float32Array", "Float64Array"];


function encodeInt(v: number, out: OutStream) {
    return packInt(isInt(v) ? v : 0, out);
}
function encodeLong(v: bigint, out: OutStream) {
    return packBigInt(isLong(v) ? v : toLong(0), out);
}

function ef32(v: number, out: OutStream) {
    return out.u8(0xca).float(Number.isFinite(v) ? v : 0);
}

function ef64(v: number, out: OutStream) {
    return out.u8(0xcb).double(Number.isFinite(v) ? v : 0);
}

function enumber(v: number, out: OutStream) {
    v = Number.isFinite(v) ? v : 0;
    return Number.isInteger(v) ? packInt(v, out) : out.u8(0xcb).double(v);
}

function estr(v: string, out: OutStream): OutStream {
    return isNilOrUndefiend(v) ? packNil(out) : packString(v.toString(), out);
}

function edate(v: Date, out: OutStream): OutStream {
    return isNilOrUndefiend(v) ? packNil(out) : packDate(v, out);
}

function eObj(v: any, out: OutStream, kFn: (v: any, out: OutStream) => OutStream, vFn: (v: any, out: OutStream) => OutStream): OutStream {
    if (isNilOrUndefiend(v)) {
        return packNil(out);
    }
    let keys = Object.keys(v);
    packObjHeader(keys.length, out);
    for (var ek of keys) {
        kFn(ek, out);
        vFn(v[ek], out);
    }
    return out;
}
function eArr(v: any, out: OutStream, fn: (v: any, out: OutStream) => OutStream): OutStream {
    if (isNilOrUndefiend(v)) {
        return packNil(out);
    }
    packArrHeader(v.length, out);
    for (var e of v) {
        fn(e, out);
    }
    return out;
}

function wrapKvEnc(kFn: (v: any, out: OutStream) => OutStream, vFn: (v: any, out: OutStream) => OutStream) {
    return function (v: any, out: OutStream) {
        return eObj(v, out, kFn, vFn);
    }
}

//包装kv数组编码
function wrapKvArrEnc(kFn: (v: any, out: OutStream) => OutStream, vFn: (v: any, out: OutStream) => OutStream) {
    let fn = (e: any, out: OutStream) => {
        return eObj(e, out, kFn, vFn);
    };
    return function (v: any, out: OutStream) {
        return eArr(v, out, fn);
    }
}

//包装一维数组编码
function wrapArrEnc(fn: (v: any, out: OutStream) => OutStream) {
    return function (v: any, out: OutStream): OutStream {
        return eArr(v, out, fn);
    }
}

//包装二维数组编码
function wrapArr2Enc(fn: (v: any, out: OutStream) => OutStream) {
    return function (v: any, out: OutStream) {
        return eArr(v, out, (ev, eout) => {
            return eArr(ev, eout, fn);
        });
    }
}

function anysEnc(v: any, out: OutStream) {
    return isNilOrUndefiend(v) ? packNil(out) : packArray(v, out);
}

const ekv_key_int = (k: any, out: OutStream) => encodeInt(Number(k), out);
const ekv_key_str = <(k: any, out: OutStream) => OutStream>packString;
//支持的编码字典
const encodeFnDict: { [index: string]: (v: any, out: OutStream) => OutStream } = {
    "int8": encodeInt,
    "int16": encodeInt,
    "int32": encodeInt,
    "uint8": encodeInt,
    "uint16": encodeInt,
    "uint32": encodeInt,
    "int": encodeInt,
    "uint": encodeInt,
    "float32": ef32,
    "float64": ef64,
    "number": enumber,
    "float": ef32,
    "double": ef64,
    "byte": encodeInt,
    "short": encodeInt,
    "long": encodeLong,
    "bool": packBool,
    "boolean": packBool,
    "string": estr,
    "Date": edate,
    "any[]": anysEnc,
}

for (var k in encodeFnDict) {//构建【一维数组、二维数组、intKv数组、strKv数组】
    encodeFnDict[k + "[]"] = wrapArrEnc(encodeFnDict[k]);
    encodeFnDict[k + "[][]"] = wrapArr2Enc(encodeFnDict[k]);
    encodeFnDict[`{[index:string]:${k}}[]`] = wrapKvArrEnc(ekv_key_str, encodeFnDict[k]);
    encodeFnDict[`{[index:number]:${k}}[]`] = wrapKvArrEnc(ekv_key_int, encodeFnDict[k]);
    encodeFnDict[`{[index:string]:${k}}`] = wrapKvEnc(ekv_key_str, encodeFnDict[k]);
    encodeFnDict[`{[index:number]:${k}}`] = wrapKvEnc(ekv_key_int, encodeFnDict[k]);
}
gTypeArr.forEach(type => {//扩展类型 & ArrayBuffer
    encodeFnDict[type] = packExt;
    encodeFnDict["ArrayBuffer"] = packNative;
});

function isNilOrUndefiend(v: any) {
    return v === undefined || v === null;
}

const decode_in: { type: string, field: string } = { type: "", field: "" };

function decode_at(type: string, field: string) {
    decode_in.type = type;
    decode_in.field = field;
}

//抛出解码错误
function derr() {
    throw new Error(`decode_fail @${decode_in.type}.${decode_in.field}`);
}

function decodeInt(b: InStream, option?: boolean) {
    let n = MsgPack.unpackNumber(b);
    if (n === undefined) {
        if (option) {
            derr();
        }
        return 0;
    } else if (Number.isNaN(n)) {
        derr();
    }
    if (isLong(n)) {
        return toN53(n);
    }
    return Math.floor(n);
}
function decodeLong(b: InStream, option?: boolean) {
    let n = MsgPack.unpackNumber(b);
    if (n === undefined) {
        if (option) {
            derr();
        }
        return toLong(0);
    } else if (Number.isNaN(n)) {
        derr();
    }
    return isLong(n) ? n : toLong(n);
}
function decodeNumber(b: InStream, option?: boolean) {
    let n = MsgPack.unpackNumber(b);
    if (n === undefined) {
        if (option) {
            derr();
        }
        return 0;
    } else if (Number.isNaN(n)) {
        derr();
    } else if (isLong(n)) {
        return toN53(n);
    }
    return Number(n);
}

function dbool(b: InStream, option?: boolean) {
    return b.u8() == 0xc3;
}

//解码日期
function ddate(b: InStream, option?: boolean): Date {
    let d = unpack(b);
    if (d === undefined) {
        if (option) {
            derr();
        }
        return d;
    }
    if (!(d instanceof Date)) {
        derr();
    }
    return d;
}

//解码string
function dstr(b: InStream, option?: boolean) {
    let s: string = unpackStr(b);
    if (s === undefined || (s === null && !option)) {
        derr();
    }
    return s;
}

//解码 ArrayBuffer
function dbuffer(b: InStream, option?: boolean): ArrayBuffer {
    let d = unpack(b);
    if (isNilOrUndefiend(d)) {
        if (!option) derr();

        return d;
    }
    if (d instanceof ArrayBuffer) {
        return d;
    }
    derr();
}

//解码kv类型长度
function dObjLen(b: InStream, option?: boolean) {
    var k = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    if ((k & 0xe0) == 0x80) {//fixedMap
        return k & 0x0F;
    } else if (k == 0xde) {
        return b.u16();
    } else if (k == 0xdf) {
        return b.u32();
    }
    derr();
}
function dObj(b: InStream, option: boolean, kFn: (b: InStream, option?: boolean) => any, vFn: (b: InStream, option?: boolean) => any, vOption?: boolean) {
    let len = dObjLen(b, option);
    if (len >= 0) {
        var rsp: any = {};
        for (var i = 0; i < len; i++) {
            rsp[kFn(b)] = vFn(b, vOption);
        }
        return rsp;
    }
    return undefined;
}

//解码数组长度
function dArrLen(b: InStream, option?: boolean) {
    var k = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    if ((k & 0xf0) == 0x90) {//fixedArray
        return k & 0x0F;
    } else if (k == 0xdc) {
        return b.u16();
    } else if (k == 0xdd) {
        return b.u32();
    }
    derr();
}
function dArr(b: InStream, option: boolean, fn: (b: InStream, option?: boolean) => any, vOption?: boolean) {
    let len = dArrLen(b, option);
    if (len >= 0) {
        let rsp = new Array(len);
        for (var i = 0; i < len; i++) {
            rsp[i] = fn(b, vOption);
        }
        return rsp;
    }
    return undefined;
}
function wrapKvDec(kFn: (b: InStream, option?: boolean) => any, vFn: (b: InStream, option?: boolean) => any) {
    return function (b: InStream, option?: boolean) {
        return dObj(b, option, kFn, vFn);
    }
}

//kv类型的数组解码
function wrapKvArrDec(kFn: (b: InStream, option?: boolean) => any, vFn: (b: InStream, option?: boolean) => any) {
    let fn = (b: InStream, option?: boolean) => {
        return dObj(b, option, kFn, vFn, true);
    };
    return function (b: InStream, option?: boolean) {
        return dArr(b, option, fn);
    }
}

//解码一维数组
function wrapArrDec(fn: (b: InStream, option?: boolean) => any) {
    return function (b: InStream, option?: boolean) {
        return dArr(b, option, fn, true);
    }
}

//解码二维数组
function wrapArr2Dec(fn: (b: InStream, option?: boolean) => any) {
    let fn2 = (b: InStream, option?: boolean) => {
        return dArr(b, option, fn, true);
    }
    return function (b: InStream, option?: boolean) {
        return dArr(b, option, fn2, true);
    }
}

function anysDec(b: InStream, option?: boolean) {
    return dArr(b, option, unpack);
}

//解码-扩展类型
function dext(b: InStream, option?: boolean) {
    var k = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    switch (k) {
        case 0xd4:
            return unpackExt(b, 1, b.u8());
        case 0xd5:
            return unpackExt(b, 2, b.u8());
        case 0xd6:
            return unpackExt(b, 4, b.u8());
        case 0xd7:
            return unpackExt(b, 8, b.u8());
        case 0xd8:
            return unpackExt(b, 16, b.u8());
        case 0xc7:
            return unpackExt(b, b.u8(), b.u8());
        case 0xc8:
            return unpackExt(b, b.u16(), b.u8());
        case 0xc9:
            return unpackExt(b, b.u32(), b.u8());
    }
    derr();
}

//支持的解码字典
const decodeFnDict: { [index: string]: (input: InStream, option?: boolean) => any } = {
    "int8": decodeInt,
    "int16": decodeInt,
    "int32": decodeInt,
    "uint8": decodeInt,
    "uint16": decodeInt,
    "uint32": decodeInt,
    "int": decodeInt,
    "uint": decodeInt,
    "float32": decodeNumber,
    "float64": decodeNumber,
    "number": decodeNumber,
    "byte": decodeInt,
    "short": decodeInt,
    "long": decodeLong,
    "bool": dbool,
    "boolean": dbool,
    "string": dstr,
    "Date": ddate,
    "any[]": anysDec,
}
for (var k in decodeFnDict) {//构建【一维数组、二维数组、intKv数组、strKv数组】
    decodeFnDict[k + "[]"] = wrapArrDec(decodeFnDict[k]);
    decodeFnDict[k + "[][]"] = wrapArr2Dec(decodeFnDict[k]);
    decodeFnDict[`{[index:string]:${k}}[]`] = wrapKvArrDec(dstr, decodeFnDict[k]);
    decodeFnDict[`{[index:number]:${k}}[]`] = wrapKvArrDec(decodeInt, decodeFnDict[k]);
    decodeFnDict[`{[index:string]:${k}}`] = wrapKvDec(dstr, decodeFnDict[k]);
    decodeFnDict[`{[index:number]:${k}}`] = wrapKvDec(decodeInt, decodeFnDict[k]);
}
gTypeArr.forEach(type => {//扩展类型 & ArrayBuffer
    decodeFnDict[type] = dext;
    decodeFnDict["ArrayBuffer"] = dbuffer;
});

function link_x_codec(k: string, encs: any, decs: any) {
    let iks = ["number", "uint", "int", "ushort", "short", "uint32", "int32", "uint16", "int16", "uint8", "int8"];
    encs[`${k}[]`] = wrapArrEnc(encs[k]);
    encs[`{[index:string]:${k}}`] = wrapKvEnc(ekv_key_str, encs[k]);
    encs[`{[index:string]:${k}}[]`] = wrapKvArrEnc(ekv_key_str, encs[k]);
    for (var ik of iks) {
        encs[`{[index:${ik}]:${k}}`] = wrapKvEnc(ekv_key_int, encs[k]);
        encs[`{[index:${ik}]:${k}}[]`] = wrapKvArrEnc(ekv_key_int, encs[k]);
    }

    decs[`${k}[]`] = wrapArrDec(decs[k]);
    decs[`{[index:string]:${k}}`] = wrapKvDec(dstr, decs[k]);
    decs[`{[index:string]:${k}}[]`] = wrapKvArrDec(dstr, decs[k]);
    for (var ik of iks) {
        decs[`{[index:${ik}]:${k}}`] = wrapKvDec(decodeInt, decs[k]);
        decs[`{[index:${ik}]:${k}}[]`] = wrapKvArrDec(decodeInt, decs[k]);
    }
}