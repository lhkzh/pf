import {msgpack} from "./msgpack";
import OutStream = msgpack.OutStream;
import packInt = msgpack.packInt;
import packUInt = msgpack.packUInt;
import packDate = msgpack.packDate;
import packString = msgpack.packString;
import packArrHeader = msgpack.packArrHeader;
import packBool = msgpack.packBool;
import InStream = msgpack.InStream;
import unpackExt = msgpack.unpackExt;
import unpackDate = msgpack.unpackDate;
import packExt = msgpack.packExt;

export type int8 = number;
export type int16 = number;
export type int32 = number;
export type uint8 = number;
export type uint16 = number;
export type uint32 = number;
export type int = number;
export type uint = number;
export type float32 = number;
export type float64 = number;

const gTypeArr = ["Int8Array", "Int16Array", "Int32Array", "Uint8Array", "Uint16Array", "Uint32Array", "Float32Array", "Float64Array"];

export class MsgCodec {
    private encs: any = {};
    private decs: any = {};
    private ids: any = {};
    private protocols: any;
    private initCap: number;
    private incrCap: number;

    constructor(cfg: { options: any, protocols: any }) {
        this.encs = {};
        this.decs = {};
        this.protocols = cfg.protocols;
        this.initCap = cfg.options && cfg.options.initCap ? cfg.options.initCap : 256;
        this.incrCap = cfg.options && cfg.options.incrCap ? cfg.options.incrCap : 256;
        for (var k in this.protocols) {
            var v = this.protocols[k];
            if (typeof v != "string") {
                this.ids[v.id] = k;
                this.encs[k] = this.buildEncFn(k, v);
                this.decs[k] = this.buildDecFn(k, v);

                this.encs[`${k}[]`] = wrapArrEnc(this.encs[k]);
                this.decs[`${k}[]`] = wrapArrDec(this.decs[k]);

                this.encs[`{[index:string]:${k}}[]`] = wrapKvArrEnc(true, this.encs[k]);
                this.encs[`{[index:number]:${k}}[]`] = wrapKvArrEnc(false, this.encs[k]);
                this.decs[`{[index:string]:${k}}[]`] = wrapKvArrDec(true, this.decs[k]);
                this.decs[`{[index:number]:${k}}[]`] = wrapKvArrDec(false, this.decs[k]);
            }
        }
    }

    public getTypeById(id: number): string {
        return this.ids[id];
    }

    public encode(type: string, data: any, out?: OutStream) {
        return this.encs[type](data, out || new OutStream(this.initCap, this.incrCap)).bin();
    }

    public decode(type: string, val: Uint8Array | InStream) {
        return this.decs[type](val instanceof InStream ? val : new InStream(val.buffer), false);
    }

    private buildDecFn(clazz: string, info: any) {
        let members = info.members;

        if (members.length == 1 && members[0][2] == 2) {//index_kv
            let vType = this.getLinkType(members[0][1]);
            const keyFn: any = members[0][0] == "string" ? dstr : dint;
            const valFn = decodeFnDict.hasOwnProperty(vType) ? decodeFnDict[vType] : this.getStructLinkDecFn(vType);
            return function (input: InStream, option: boolean) {
                var len = dObjLen(input, option);
                if (len >= 0) {
                    var rsp: any = {};
                    for (var i = 0; i < len; i++) {
                        rsp[keyFn(input, false)] = valFn(input, false);
                    }
                    return rsp;
                }
                return undefined;
            }
        } else {
            let fns: Array<(input: InStream, option?: boolean) => any> = [], fnn:number=0;
            for (var node of members) {
                //key = node[0], val=node[1], option=node[2]
                fns.push(this.getStructFieldDecFn(node[0], node[1]));
                if(node[2]==0){
                    fnn++;
                }
            }
            return function (input: InStream, option: boolean) {
                // var len = dObjLen(input, option);
                var len = dArrLen(input, option);
                if (len >= 0) {
                    var rsp: any = {};

                    if (len == members.length) {
                        for (var i = 0; i < len; i++) {
                            rsp[members[i][0]] = fns[i](input, members[i][2] == 1);
                        }
                    }else if(len>members.length){
                        for (var i = 0; i < members.length; i++) {
                            rsp[members[i][0]] = fns[i](input, members[i][2] == 1);
                        }
                        for(i=members.length; i<len; i++){
                            msgpack.decode2(input);
                        }
                    }else if(len<fnn){
                        throw new Error("decode_fail:members match fail");
                    }else {
                        for (var i = 0; i < members.length; i++) {
                            if(i>=len){
                                if(members[i][2]==0){
                                    throw new Error("decode_fail:members match fail");
                                }
                                rsp[members[i][0]] = undefined;
                            }else{
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
            const keyFn: any = members[0][0] == "string" ? estr : eint;
            const valFn = encodeFnDict.hasOwnProperty(vType) ? encodeFnDict[vType] : this.getStructLinkEncFn(vType);
            return function (v: any, out: OutStream) {
                if (isNilOrUndefiend(v)) {
                    out.u8(0xc0);
                } else {
                    let eks = Object.keys(v);
                    eObjLen(eks.length, out);
                    for (var ek of eks) {
                        keyFn(ek, out);
                        valFn(v[ek], out);
                    }
                }
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
                    out.u8(0xc0);
                } else {
                    // eObjLen(members.length, out);
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
            return this.buildEncFn("", {members: t});
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
            return this.buildDecFn("", {members: t});
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

function ei8(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xd0).i8(v);
}

function ei16(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xd1).i16(v);
}

function ei32(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xd2).i32(v);
}

function eu8(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.bb(0xcc, v);
}

function eu16(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xcd).u16(v);
}

function eu32(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xce).u32(v);
}

function eint(v: number, out: OutStream) {
    if (isNilOrUndefiend(v)) {
        return out.u8(0xc0);
    }
    return packInt(v, out);
}

function euint(v: number, out: OutStream) {
    if (isNilOrUndefiend(v)) {
        return out.u8(0xc0);
    }
    return packUInt(v, out);
}

function ef32(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xca).float(v);
}

function ef64(v: number, out: OutStream) {
    return isNilOrUndefiend(v) ? out.u8(0xc0) : out.u8(0xcb).double(v);
}

function enumber(v: number, out: OutStream) {
    if (isNilOrUndefiend(v)) {
        return out.u8(0xc0);
    }
    return Number.isInteger(v) ? packInt(v, out) : out.u8(0xcb).double(v);
}

function ebuffer(v: ArrayBuffer, out: OutStream) {
    if (isNilOrUndefiend(v)) {
        return out.u8(0xc0);
    }
    let size = v.byteLength;
    if (size < 256) {
        out.u8(0xc4).u8(size);
    } else if (size <= 0xffff) {
        out.u8(0xc5).u16(size);
    } else {
        out.u8(0xc6).u32(size);
    }
    return out.blob(new Uint8Array(v));
}

function eObjLen(len: number, out: OutStream) {
    if (len < 16) {
        out.u8(0x80 | len);
    } else {
        out.u8(0xde).u16(len);
    }
    return out;
}

function wrapBaseEnc(fn: (v: any, out: OutStream) => OutStream) {
    return function (v: any, out: OutStream) {
        if (isNilOrUndefiend(v)) {
            return out.u8(0xc0);
        }
        return fn(v, out);
    }
}

function wrapKvArrEnc(strKey: boolean, vFn: (v: any, out: OutStream) => OutStream) {
    let kFn = strKey ? estr : (ev: any, eout: OutStream) => eint(Number(ev), eout);
    return function (v: any, out: OutStream) {
        if (isNilOrUndefiend(v)) {
            return out.u8(0xc0);
        }
        let keys = Object.keys(v);
        eObjLen(keys.length, out);
        for (var ek of keys) {
            kFn(ek, out);
            vFn(v[ek], out);
        }
        return out;
    }
}

function wrapArrEnc(fn: (v: any, out: OutStream) => OutStream) {
    return function (v: any, out: OutStream) {
        if (isNilOrUndefiend(v)) {
            return out.u8(0xc0);
        }
        packArrHeader(v.length, out);
        for (var e of v) {
            fn(e, out);
        }
        return out;
    }
}

function wrapArr2Enc(fn: (v: any, out: OutStream) => OutStream) {
    return function (v: any, out: OutStream) {
        if (isNilOrUndefiend(v)) {
            return out.u8(0xc0);
        }
        packArrHeader(v.length, out);
        for (var e of v) {
            if (isNilOrUndefiend(e)) {
                out.u8(0xc0);
            } else {
                packArrHeader(e.length, out);
                for (var ee of e) {
                    fn(ee, out);
                }
            }
        }
        return out;
    }
}

const estr = wrapBaseEnc(packString);
const edate = wrapBaseEnc(packDate);

const encodeFnDict: { [index: string]: (v: any, out: OutStream) => OutStream } = {
    "int8": ei8,
    "int16": ei16,
    "int32": ei32,
    "uint8": eu8,
    "uint16": eu16,
    "uint32": eu32,
    "int": eint,
    "uint": euint,
    "float32": ef32,
    "float64": ef64,
    "number": enumber,
    "short": ei16,
    "long": eint,
    "boolean": packBool,
    "Date": edate,
    "string": estr,
}

for (var k in encodeFnDict) {
    encodeFnDict[k + "[]"] = wrapArrEnc(encodeFnDict[k]);
    encodeFnDict[k + "[][]"] = wrapArr2Enc(encodeFnDict[k]);
    encodeFnDict[`{[index:string]:${k}}[]`] = wrapKvArrEnc(true, encodeFnDict[k]);
    encodeFnDict[`{[index:number]:${k}}[]`] = wrapKvArrEnc(false, encodeFnDict[k]);
}
gTypeArr.forEach(type => {
    encodeFnDict[type] = packExt;
    encodeFnDict["ArrayBuffer"] = ebuffer;
});

function derr() {
    throw new Error("decode_fail");
}

function isNilOrUndefiend(v: any) {
    return v === undefined || v === null;
}

function di8(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xd0) {
        derr();
    }
    return b.i8();
}

function di16(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xd1) {
        derr();
    }
    return b.i16();
}

function di32(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xd2) {
        derr();
    }
    return b.i32();
}

function du8(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xcc) {
        derr();
    }
    return b.u8();
}

function du16(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xcd) {
        derr();
    }
    return b.u16();
}

function du32(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xce) {
        derr();
    }
    return b.u32();
}

function dint(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    if (k <= 0x7f || k >= 0xe0) {//fixInt
        return k;
    }
    switch (k) {
        case 0xd0:
            return b.i8();
        case 0xd1:
            return b.i16();
        case 0xd2:
            return b.i32();
        case 0xd3:
            return b.long();
        case 0xcc:
            return b.u8();
        case 0xcd:
            return b.u16();
        case 0xce:
            return b.u32();
        case 0xcf:
            return b.long();
    }
    derr();
}

function df32(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xca) {
        derr();
    }
    return b.float();
}

function df64(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    } else if (k != 0xcb) {
        derr();
    }
    return b.double();
}

function dnumber(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    if (k <= 0x7f || k >= 0xe0) {//fixInt
        return k;
    }
    switch (k) {
        case 0xca:
            return b.float();
        case 0xcb:
            return b.double();
        case 0xd0:
            return b.i8();
        case 0xd1:
            return b.i16();
        case 0xd2:
            return b.i32();
        case 0xd3:
            return b.long();
        case 0xcc:
            return b.u8();
        case 0xcd:
            return b.u16();
        case 0xce:
            return b.u32();
        case 0xcf:
            return b.long();
    }
    derr();
}

function dbool(b: InStream, option?: boolean) {
    return b.u8() == 0xc3;
}

function ddate(b: InStream, option?: boolean) {
    let k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    if (b.u8() != 255) {//255=date@msg
        derr();
    }
    if (k == 0xd6) {
        return unpackDate(b, 4);
    } else if (k == 0xd7) {
        return unpackDate(b, 8);
    }
    derr();
}

function dstr(b: InStream, option?: boolean) {
    var k: any = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    if ((k & 0xe0) == 0xa0) {//fixedString
        return b.str(k & 0x1F);
    } else if (k == 0xd9) {
        return b.str(b.u8());
    } else if (k == 0xda) {
        return b.str(b.u16());
    } else if (k == 0xdb) {
        return b.str(b.u32());
    }
    derr();
}

function dbuffer(b: InStream, option?: boolean) {
    var k = b.u8();
    if (k == 0xc0) {
        return option ? undefined : derr();
    }
    let size;
    if (k == 0xc4) {
        size = b.u8();
    } else if (k == 0xc5) {
        size = b.u16();
    } else if (k == 0xc6) {
        size = b.u32();
    } else {
        derr();
    }
    return b.bin(size).buffer;
}

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

function wrapKvArrDec(strKey: boolean, vFn: (b: InStream, option?: boolean) => any) {
    let kFn = strKey ? dstr : dint;
    return function (b: InStream, option?: boolean) {
        let len = dObjLen(b, option);
        if (len >= 0) {
            var rsp: any = {};
            for (var i = 0; i < len; i++) {
                rsp[kFn(b)] = vFn(b);
            }
            return rsp;
        }
        return undefined;
    }
}

function wrapArrDec(fn: (b: InStream, option?: boolean) => any) {
    return function (b: InStream, option?: boolean) {
        let len = dArrLen(b, option);
        if (len >= 0) {
            let rsp = new Array(len);
            for (var i = 0; i < len; i++) {
                rsp[i] = fn(b);
            }
            return rsp;
        }
        return undefined;
    }
}

function wrapArr2Dec(fn: (b: InStream, option?: boolean) => any) {
    return function (b: InStream, option?: boolean) {
        let len = dArrLen(b, option);
        if (len >= 0) {
            let rsp = new Array(len);
            for (var i = 0; i < len; i++) {
                var slen = dArrLen(b, option);
                var srsp;
                if (slen >= 0) {
                    srsp = new Array(slen);
                    for (var j = 0; j < slen; j++) {
                        srsp = fn(b);
                    }
                }
                rsp[i] = srsp;
            }
            return rsp;
        }
        return undefined;
    }
}

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

const decodeFnDict: { [index: string]: (input: InStream, option?: boolean) => any } = {
    "int8": di8,
    "int16": di16,
    "int32": di32,
    "uint8": du8,
    "uint16": du16,
    "uint32": du32,
    "int": dint,
    "uint": dint,
    "float32": df32,
    "float64": df64,
    "number": dnumber,
    "short": di16,
    "long": dint,
    "boolean": dbool,
    "Date": ddate,
    "string": dstr,
}
for (var k in decodeFnDict) {
    decodeFnDict[k + "[]"] = wrapArrDec(decodeFnDict[k]);
    decodeFnDict[k + "[][]"] = wrapArr2Dec(decodeFnDict[k]);
    decodeFnDict[`{[index:string]:${k}}[]`] = wrapKvArrDec(true, decodeFnDict[k]);
    decodeFnDict[`{[index:number]:${k}}[]`] = wrapKvArrDec(false, decodeFnDict[k]);
}
gTypeArr.forEach(type => {
    decodeFnDict[type] = dext;
    decodeFnDict["ArrayBuffer"] = dbuffer;
});