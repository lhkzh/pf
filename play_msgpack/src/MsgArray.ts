
export type NewableAny = { new(...params: any[]): any }
export type Newable<T> = { new(...params: any[]): T }

export enum MType {
    BOOL,
    I8,
    I16,
    I32,
    I64,
    I53,
    F32,
    F64,
    STR,
    DATE
}

// export type PrimitiveArr = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
export type MetaType = MType |
["Arr", MType | NewableAny] |
["Obj", MType.I8 | MType.I16 | MType.I32 | MType.I53 | MType.I64 | MType.STR, MType | NewableAny] |
["Set", MType | NewableAny] |
["Map", MType.I8 | MType.I16 | MType.I32 | MType.I53 | MType.I64 | MType.STR, MType | NewableAny]
    | ArrayBufferView
    | NewableAny
    ;


type MetaInfoFieldOption = 0 | 1;
type MetaInfoField = [string, MetaType, MetaInfoFieldOption];// | [string, MsgType];
export type MetaInfoObj = { id: number, name: string, fields: Array<MetaInfoField>, clazz: NewableAny };
const _nameS: Map<string, MetaInfoObj> = new Map();
const _idS: Map<number, MetaInfoObj> = new Map();
const _typeS: Map<NewableAny, MetaInfoObj> = new Map();

let Meta_ID = 1;
let Cast_Int64: (v: any) => any = (v: any) => {
    return BigInt(v);
};

export abstract class MsgArray {

    public toArray(): any[] {
        return (<any>this.constructor)["ToArray"](this);
    }
    public static ToArray<T extends MsgArray>(v: T): any[] {
        return (<any>v.constructor)["ToArray"](v);
    }
    public static FromArray<T extends MsgArray>(a: any[]): T {
        return <T><unknown>null;
    }
    public static CastByArray<T extends MsgArray>(type: Newable<T>, arr: any[]): T {
        return (<any>type)["FromArray"](arr);
    }
    public static Meta(info: { id?: number, name?: string, fields: Array<MetaInfoField> }): ClassDecorator {
        return function (T: any) {
            MsgArray.MetaBind(T, info.id || Meta_ID++, info.name || T.name, info.fields);
        }
    }
    public static MetaBind(T: NewableAny, id: number, name: string, fields: Array<MetaInfoField>) {
        if (_idS.has(id) || _nameS.has(name)) {
            throw new TypeError("MsgInfo.(id or name).conflict:" + id + "_" + name);
        }
        const obj = Object.freeze({ id, name, fields, clazz: T });
        _idS.set(id, obj);
        _nameS.set(name, obj);
        _typeS.set(T, obj);
        T.prototype.toArray = function () {
            return (<any>T)["ToArray"](this);
        };
        T.prototype.toString = function () {
            return `[Class:${name}]=>${MsgArray.Stringify(this)}`;
        };
        (<any>T)["ToArray"] = function (a: any): any[] {
            if (a == null) return <any[]><unknown>null;
            let r = new Array(fields.length);
            for (var i = 0; i < r.length; i++) {
                let v = a[fields[i][0]], t: any = fields[i][1];
                if (v) {
                    if (t["ToArray"]) {
                        v = t["ToArray"](v);
                    } else if (Array.isArray(t)) {
                        if (t[0] == "Arr") {
                            if (t[1]["ToArray"]) {
                                v = v.map((e: any) => t[1]["ToArray"](e));
                            }
                        } else if (t[0] == "Set") {
                            let rarr = [];
                            if (t[1]["ToArray"]) {
                                for (let e of v) {
                                    rarr.push(t[1]["ToArray"](e));
                                }
                            } else {
                                for (let e of v) {
                                    rarr.push(e);
                                }
                            }
                            v = rarr;
                        } else if (t[0] == "Obj") {
                            let rarr = [];
                            if (t[2]["ToArray"]) {
                                for (let k in v) {
                                    rarr.push(t[1] != MType.STR ? Number(k) : k, t[2]["ToArray"](v[k]));
                                }
                            } else {
                                for (let k in v) {
                                    rarr.push(t[1] != MType.STR ? Number(k) : k, v[k]);
                                }
                            }
                            v = rarr;
                        } else if (t[0] == "Map") {
                            let rarr = [];
                            if (t[2]["ToArray"]) {
                                for (let e of v) {
                                    rarr.push(e[0], t[2]["ToArray"](e[1]));
                                }
                            } else {
                                for (let e of v) {
                                    rarr.push(e[0], e[1]);
                                }
                            }
                            v = rarr;
                        } else {
                            throw new TypeError("NOT implemented:" + t[0]);
                        }
                    }
                }
                r[i] = v;
            }
            return r;
        };
        (<any>T)["FromArray"] = function (a: any[]) {
            if (a == null) return null;
            if (!Array.isArray(a)) throw new TypeError(`Decode Fail-0:${name}`);
            let r = new T();
            for (var i = 0; i < fields.length; i++) {
                r[fields[i][0]] = cast_val_field(a[i], name, fields[i]);
            }
            return r;
        }
    }

    public static ClassByName(name: string): NewableAny | undefined {
        return _nameS.get(name)?.clazz;
    }
    public static ClassById(id: number): NewableAny | undefined {
        return _idS.get(id)?.clazz;
    }
    public static MetaByName(name: string): MetaInfoObj | undefined {
        return _nameS.get(name);
    }
    public static MetaById(id: number): MetaInfoObj | undefined {
        return _idS.get(id);
    }
    public static MetaByClass(T: NewableAny): MetaInfoObj | undefined {
        return _typeS.get(T);
    }
    public static MetaIdList(): number[] {
        let arr: number[] = [];
        _idS.forEach((v, k) => {
            arr.push(k);
        });
        return arr;
        // return [..._idS.keys()];
    }
    public static MetaNameList(): string[] {
        let arr: string[] = [];
        _nameS.forEach((v, k) => {
            arr.push(k);
        });
        return arr;
        // return [..._nameS.keys()];
    }
    public static SetCastInt64(fn: (v: any) => any) {
        Cast_Int64 = fn || Cast_Int64;
    }
    public static Stringify(val: any, space?: number | string) {
        return JSON.stringify(val, JsonReviverEncode, space);
    }
}

function cast_val_field(v: any, typeName: string, fieldInfo: MetaInfoField) {
    const typeField = fieldInfo[0], type = fieldInfo[1];
    if (v === undefined || v === null) {
        if (fieldInfo[2] == 1)
            throw new TypeError(`Decode Fail-(need require):${typeName}.${typeField}`);
        if (Number.isInteger(type)) {
            if (type >= MType.I8 && type <= MType.F64) {
                if (type == MType.I64) {
                    return Cast_Int64(0);
                }
                return 0;
            } else if (type == MType.STR) {
                return "";
            }
        } else if (Array.isArray(type)) {
            let a = <any[]>type;
            if (a[0] == "Arr") {
                return [];
            } else if (a[0] == "Obj") {
                return {};
            } else if (a[0] == "Set") {
                return new Set();
            } else if (a[0] == "Map") {
                return new Map();
            }
        } else if ((<any>type)["BYTES_PER_ELEMENT"] > 0) {//TypeArray
            return new (<any>type)();
        }
        return v;
    } else if (Number.isInteger(type)) {
        return cast_primitive(v, <MType>type, typeName, typeField);
    } else if (Array.isArray(type)) {
        if (!Array.isArray(v)) {
            cast_fail_type(typeName, typeField);
        }
        let a = <any[]>type;
        if (a[0] == "Arr") {
            return v.map((e: any) => cast_or_msg(e, a[1], typeName, typeField));
        } else if (a[0] == "Obj") {
            let rObj: any = {};
            for (let i = 0; i < v.length; i += 2) {
                rObj[cast_primitive(v[i], a[1], typeName, typeField)] = cast_or_msg(v[i + 1], a[2], typeName, typeField);
            }
            return rObj;
        } else if (a[0] == "Set") {
            return new Set(v.map((e: any) => cast_or_msg(e, a[1], typeName, typeField)));
        } else if (a[0] == "Map") {
            let rMap = new Map();
            for (let i = 0; i < v.length; i += 2) {
                rMap.set(cast_primitive(v[i], a[1], typeName, typeField), cast_or_msg(v[i + 1], a[2], typeName, typeField));
            }
            return rMap;
        }
    } else if ((<any>type)["BYTES_PER_ELEMENT"] > 0) {//TypeArray
        if (ArrayBuffer.isView(v)) {
            return new (<any>type)(v.buffer);
        } else if (Array.isArray(v)) {
            return new (<any>type)(v);
        } else if (v instanceof ArrayBuffer) {
            return new (<any>type)(v);
        } else {
            cast_fail_type(typeName, typeField);
        }
    } else {
        return (<any>type).FromArray(v);
    }
}
function cast_or_msg(v: any, type: MType | NewableAny, typeName: string, typeField: string) {
    if (MType[<MType>type]) {
        return cast_primitive(v, <MType>type, typeName, typeField);
    }
    return (<any>type).FromArray(v);
}
function cast_primitive(v: any, type: MType, typeName: string, typeField: string) {
    if ((type == MType.DATE && !(v instanceof Date)) ||
        (type == MType.STR && typeof (v) != "string")
    ) {
        cast_fail_type(typeName, typeField);
    } else if (type == MType.I64) {
        v = Cast_Int64(v);
    } else if (type == MType.BOOL) {
        v = Boolean(v);
    } else if (v >= MType.I8 && type <= MType.F64) {
        v = Number(v);
        if (!Number.isFinite(v))
            cast_fail_type(typeName, typeField);
    }
    return v;
}
function cast_fail_type(typeName: string, typeField: string) {
    throw new TypeError(`Decode Fail-2:${typeName}.${typeField}`);
}

function JsonReviverEncode(key: string, value: any): any {
    if (typeof (value) == "bigint") {
        return {
            type: "bigint",
            data: value.toString(),
        };
    } else if (value instanceof Map) {
        return {
            type: "Map",
            data: Array.from(value.entries()),
        };
    } else if (value instanceof Set) {
        return {
            type: "Set",
            data: Array.from(value.entries()),
        };
    } else if (value && value.buffer instanceof ArrayBuffer) {
        return {
            type: value.constructor.name,
            data: Array.from(value),
        };
    }
    return value;
}