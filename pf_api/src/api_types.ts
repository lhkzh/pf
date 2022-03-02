/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * 基础类型转换方法(Boolean、String、Number、Array、TypeArray、Date、BigInt)
 * @author zhh
 */
import * as util from "util";
import {DtoConvert, DtoIs} from "./api_dto";

const HadNoNumberReg = /\D/;
const NumberReg = /^[0-9\.]+$/;

function gen_type_array_cast(type) {
    return function (v) {
        if (Array.isArray(v)) {
            return new type(v);
        }
        if (Buffer.isBuffer(v)) {
            return new type(v);
        }
        if (Number.isFinite(v)) {
            return new type([v]);
        }
        if (NumberReg.test(v)) {
            return new type([Number(v)]);
        }
        return null;
        // throw new TypeError("cast_fail:"+type+" from="+v);
    }
}

const cast_type_map = new Map();
cast_type_map.set(Boolean, v => {
    return Boolean(v);//v!="false"&&v!="0"&&v!="no";
});
cast_type_map.set(String, v => {
    return String(v);
});
cast_type_map.set(Number, v => {
    return Number(v);
});
cast_type_map.set(Array, v => {
    if (!v) return null;
    if (util.isString(v)) {
        if (v[0] == '[' && v[v.length - 1] == ']') {
            return JSON.parse(v);
        }
        if (v.indexOf(',') > 0) {
            return v.split(',');
        }
        return v.split('|');
    }
    return Array.isArray(v) ? v : Array(v);
});
cast_type_map.set(global["BigInt"], v => {
    return global["BigInt"](v);
});
cast_type_map.set(Map, v => {
    if (util.isMap(v)) return v;
    if (!util.isObject(v)) return null;
    let m = new Map();
    for (var k in v) {
        m.set(k, v[k]);
    }
    return m;
});
cast_type_map.set(Date, v => {
    if (HadNoNumberReg.test(v) == false) {
        v = Number(v);
    }
    return new Date(v);
});
[Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array].forEach(c => {
    cast_type_map.set(c, gen_type_array_cast(c));
});

/**
 * 类型转换
 * @param type
 * @param arg
 */
export function type_convert(type: any, arg: any): any {
    if (type.cast != null) {//uti.isFunction(type.cast)
        return type.cast(arg);
    }
    if (cast_type_map.has(type)) {
        if (util.isObject(arg)) {//JSON.stringify TypeArray默认会变object
            arg = Object.values(arg);
        }
        return cast_type_map.get(type)(arg);
    }
    try {
        if (DtoIs(type)) {
            return DtoConvert(type, arg);
        }
        return type(arg);
    } catch (e) {
        var es = e + "";
        if (es.includes("TypeError") && es.includes("constructor")) {
            try{
                var proxy = function (a) {
                    return new type(a);
                }
                let rsp = proxy(arg);
                rsp && cast_type_map.set(type, proxy);
                return rsp;
            }catch (err){
                throw e;
            }
        }
        throw e;
    }
}


//上传文件类型
export class UploadFileInfo {
    public fileName: string;
    public contentType: string;
    public body: Class_SeekableStream;

    constructor(v: any) {
        if (UploadFileInfo.check(v)) {
            this.fileName = v.fileName;
            this.contentType = v.contentType;
            this.body = v.body;
        } else {
            return null;
        }
    }

    public static cast(v: any): UploadFileInfo {
        if (UploadFileInfo.check(v)) {
            return v;
        } else {
            return null;
        }
    }

    public static check(v: any): boolean {
        return v && util.isString(v.fileName) && util.isString(v.contentType) && v.body && util.isFunction(v.body.eof);
    }
}

//整形-Number类型
export class IntNumber {
    private n: number;

    constructor(v: any) {
        this.n = v == undefined ? NaN : Math.round(Number(v));
    }

    public valueOf(): number {
        return this.n;
    }

    public static cast(v: any): number {
        if (v == undefined) {
            return null;
        }
        return Math.round(Number(v));
    }
}

//Object，其值是Number其key没有约束
export class ObjVal_Number {
    public static cast(v: any): { [index: string]: number } {
        if (v == null || !util.isObject(v)) return null;
        for (var k in v) {
            if (v[k] == null) return null;
            var n = Number(v[k]);
            if (Number.isNaN(n)) {
                return null;
            }
            v[k] = n;
        }
        return v;
    }
}

//Object，其值是Number其key是有约束为可转为Number的字符串
export class ObjKV_Number {
    public static cast(v: any): { [index: number]: number } {
        if (v == null || !util.isObject(v)) return null;
        for (var k in v) {
            if (v[k] == null) return null;
            var n = Number(v[k]);
            if (Number.isNaN(n) || Number.isNaN(Number[n])) {
                return null;
            }
            v[k] = n;
        }
        return v;
    }
}

//Map， key是string，value是number
export class MapVal_Number extends Map<string, number> {
    constructor(es?: { [index: string]: number }) {
        super();
        if (es) {
            for (var k in es) {
                this.set(k, es[k]);
            }
        }
    }

    public static cast(v: any): Map<string, number> {
        if (v == null || !util.isObject(v)) return null;
        var m = new Map<string, number>();
        for (var k in v) {
            if (v[k] == null) return null;
            var n = Number(v[k]);
            if (Number.isNaN(n)) {
                return null;
            }
            m.set(k, n);
        }
        return m;
    }
}

//Map， key是number，value是number
export class MapKV_Number extends Map<number, number> {
    constructor(es?: { [index: number]: number }) {
        super();
        if (es) {
            for (var k in es) {
                this.set(Number(k), Number(es[k]));
            }
        }
    }

    public static cast(v: any): Map<number, number> {
        if (v == null || !util.isObject(v)) return null;
        var m = new Map<number, number>(), ek;
        for (var k in v) {
            if (v[k] == null) return null;
            var n = Number(v[k]);
            if (Number.isNaN(n)) {
                return null;
            }
            ek = Number(k);
            if (Number.isNaN(ek)) {
                return null;
            }
            m.set(ek, n);
        }
        return m;
    }
}

