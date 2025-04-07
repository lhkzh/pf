/**
 * 类型定义
 * @public
 */
var MT;
(function (MT) {
    MT[MT["BOOL"] = 0] = "BOOL";
    MT[MT["BYTE"] = 1] = "BYTE";
    MT[MT["SHORT"] = 2] = "SHORT";
    MT[MT["INT"] = 3] = "INT";
    MT[MT["LONG"] = 4] = "LONG";
    MT[MT["I53"] = 5] = "I53";
    MT[MT["FLOAT"] = 6] = "FLOAT";
    MT[MT["DOUBLE"] = 7] = "DOUBLE";
    MT[MT["STR"] = 8] = "STR";
    MT[MT["DATE"] = 9] = "DATE";
    MT[MT["OBJ"] = 10] = "OBJ";
    MT[MT["ARR"] = 11] = "ARR";
    MT[MT["MAP"] = 12] = "MAP";
    MT[MT["SET"] = 13] = "SET";
})(MT || (MT = {}));
const _nameS = new Map();
const _idS = new Map();
const _typeS = new Map();
let Meta_ID = 0;
let Next_Id = (name) => {
    return --Meta_ID;
};
let Cast_Int64 = (v) => {
    return BigInt(v);
};
/**
 * 消息数组基类
 * @public
 */
class MsgArray {
    static CHECK = { OUT: false, IN: true };
    toString() {
        return `[Class:${this.constructor.name}]=>${JsonX.Stringify(JsonDecycle(this))}`;
    }
    toArray($deep) {
        return this.constructor.ToArray(this, $deep);
    }
    toRefArray() {
        return this.constructor.ToRefArray(this);
    }
    static CastByArray(type, arr) {
        return type.FromArray(arr);
    }
    static CastByRefArray(type, arr) {
        return type.FromRefArray(arr);
    }
    static ToArray(v, $deep) {
        if (v == null)
            return null;
        return v.constructor.ToArray(v, $deep);
    }
    static FromArray(a) {
        return null;
    }
    static ToRefArray(v) {
        if (v == null)
            return null;
        return v.constructor.ToRefArray(v);
    }
    static FromRefArray(a) {
        return null;
    }
    static ClassByName(name) {
        return _nameS.get(name)?.clazz;
    }
    static ClassById(id) {
        return _idS.get(id)?.clazz;
    }
    static MetaByName(name) {
        return _nameS.get(name);
    }
    static MetaById(id) {
        return _idS.get(id);
    }
    static MetaByClass(T) {
        return _typeS.get(T);
    }
    static MetaIdList() {
        let arr = [];
        _idS.forEach((v, k) => {
            arr.push(k);
        });
        return arr;
        // return [..._idS.keys()];
    }
    static MetaNameList() {
        let arr = [];
        _nameS.forEach((v, k) => {
            arr.push(k);
        });
        return arr;
        // return [..._nameS.keys()];
    }
    static set CastInt64(fn) {
        Cast_Int64 = fn || Cast_Int64;
    }
    static get CastInt64() {
        return Cast_Int64;
    }
    static set NextId(fn) {
        Next_Id = fn || Next_Id;
    }
    /**
     * 注解类属性信息的方法
     */
    static Meta(info) {
        return function (T) {
            let cname = info.name || T.name;
            MsgArray.MetaBind(T, info.id || Next_Id(cname), cname, info.fields);
        };
    }
    /**
     * 绑定类与属性关系
     */
    static MetaBind(T, id, name, fields) {
        if (_idS.has(id) || _nameS.has(name)) {
            throw new TypeError("MsgInfo.(id or name).conflict:" + id + "_" + name);
        }
        const obj = Object.freeze({ id, name, fields, clazz: T });
        _idS.set(id, obj);
        _nameS.set(name, obj);
        _typeS.set(T, obj);
        T["ToJSON"] = function (a, $deep = 8) {
            if (a == null)
                return null;
            if ($deep < 0) {
                throw new Error("max stack limit: check circle reference");
            }
            let r = {};
            for (var i = 0; i < fields.length; i++) {
                let f = fields[i];
                let v = a[f[0]], t = f[1];
                if (v) {
                    if (t.ToJSON) {
                        v = t.ToJSON(v, $deep - 1);
                    }
                }
                else if (Array.isArray(t)) {
                    if (t[0] == MT.ARR) {
                        if (t[1].ToJSON) {
                            v = v.map((e) => t[1].ToJSON(e, $deep - 1));
                        }
                    }
                    else if (t[0] == MT.SET) {
                        let rarr = [];
                        if (t[1].ToJSON) {
                            v.forEach((e) => {
                                rarr.push(t[1].ToJSON(e, $deep - 1));
                            });
                        }
                        else {
                            v.forEach((e) => {
                                rarr.push(e);
                            });
                        }
                        v = rarr;
                    }
                    else if (t[0] == MT.OBJ) {
                        let rarr = [], keys = Object.keys(v);
                        if (t[2].ToJSON) {
                            keys.forEach((k) => {
                                rarr.push(t[1] != MT.STR ? Number(k) : k, t[2].ToJSON(v[k], $deep - 1));
                            });
                        }
                        else {
                            keys.forEach((k) => {
                                rarr.push(t[1] != MT.STR ? Number(k) : k, v[k]);
                            });
                        }
                        v = rarr;
                    }
                    else if (t[0] == MT.MAP) {
                        let rarr = [];
                        if (t[2].ToJSON) {
                            v.forEach((iv, ik) => {
                                rarr.push(ik, t[2].ToJSON(iv, $deep - 1));
                            });
                        }
                        else {
                            v.forEach((iv, ik) => {
                                rarr.push(ik, iv);
                            });
                        }
                        v = rarr;
                    }
                    else {
                        throw new TypeError("NOT implemented:" + t[0]);
                    }
                }
                else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
                    throw new TypeError(`Decode Fail-(need require):${name}.${fields[i][0]}`);
                }
                r[f[0]] = v;
            }
            return r;
        };
        T["ToArray"] = function (a, $deep = 8) {
            if (a == null)
                return null;
            if ($deep < 0) {
                throw new Error("max stack limit: check circle reference");
            }
            let r = new Array(fields.length);
            for (var i = 0; i < r.length; i++) {
                let v = a[fields[i][0]], t = fields[i][1];
                if (v) {
                    if (t.ToArray) {
                        v = t.ToArray(v, $deep - 1);
                    }
                    else if (Array.isArray(t)) {
                        if (t[0] == MT.ARR) {
                            if (t[1].ToArray) {
                                v = v.map((e) => t[1].ToArray(e, $deep - 1));
                            }
                        }
                        else if (t[0] == MT.SET) {
                            let rarr = [];
                            if (t[1].ToArray) {
                                v.forEach((e) => {
                                    rarr.push(t[1].ToArray(e, $deep - 1));
                                });
                            }
                            else {
                                v.forEach((e) => {
                                    rarr.push(e);
                                });
                            }
                            v = rarr;
                        }
                        else if (t[0] == MT.OBJ) {
                            let rarr = [], keys = Object.keys(v);
                            if (t[2].ToArray) {
                                keys.forEach((k) => {
                                    rarr.push(t[1] != MT.STR ? Number(k) : k, t[2].ToArray(v[k], $deep - 1));
                                });
                            }
                            else {
                                keys.forEach((k) => {
                                    rarr.push(t[1] != MT.STR ? Number(k) : k, v[k]);
                                });
                            }
                            v = rarr;
                        }
                        else if (t[0] == MT.MAP) {
                            let rarr = [];
                            if (t[2].ToArray) {
                                v.forEach((iv, ik) => {
                                    rarr.push(ik, t[2].ToArray(iv, $deep - 1));
                                });
                            }
                            else {
                                v.forEach((iv, ik) => {
                                    rarr.push(ik, iv);
                                });
                            }
                            v = rarr;
                        }
                        else {
                            throw new TypeError("NOT implemented:" + t[0]);
                        }
                    }
                }
                else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
                    throw new TypeError(`Decode Fail-(need require):${name}.${fields[i][0]}`);
                }
                r[i] = v;
            }
            return r;
        };
        T["FromArray"] = function (a) {
            if (a == null)
                return null;
            if (!Array.isArray(a))
                throw new TypeError(`Decode Fail-0:${name}`);
            let r = new T();
            for (var i = 0; i < fields.length; i++) {
                r[fields[i][0]] = cast_field_normal(a[i], name, fields[i]);
            }
            return r;
        };
        T["ToRefArray"] = function (a, $dict = new Map(), $path = "") {
            if (a == null)
                return null;
            if ($dict.has(a)) {
                return $dict.get(a);
            }
            $dict.set(a, $path);
            let r = new Array(fields.length);
            for (var i = 0; i < r.length; i++) {
                let v = a[fields[i][0]], t = fields[i][1], $path_i = $path + "." + i.toString(36);
                if (v) {
                    if (t.ToArray) {
                        v = t.ToRefArray(v, $dict, $path_i);
                    }
                    else if (Array.isArray(t)) {
                        if ($dict.has(v)) {
                            v = $dict.get(v);
                        }
                        else {
                            $dict.set(v, $path_i);
                            if (t[0] == MT.ARR) {
                                if (t[1].ToArray) {
                                    v = v.map((e, ii) => t[1].ToRefArray(e, $dict, $path_i + "." + ii.toString(36)));
                                }
                            }
                            else if (t[0] == MT.SET) {
                                let rarr = [];
                                if (t[1].ToArray) {
                                    v.forEach((e, ii) => {
                                        rarr.push(t[1].ToRefArray(e, $dict, $path_i + "." + ii.toString(36)));
                                    });
                                }
                                else {
                                    v.forEach((e) => {
                                        rarr.push(e);
                                    });
                                }
                                v = rarr;
                            }
                            else if (t[0] == MT.OBJ) {
                                let rarr = [], keys = Object.keys(v);
                                if (t[2].ToArray) {
                                    keys.forEach((ik) => {
                                        rarr.push(t[1] != MT.STR ? Number(ik) : ik, t[2].ToRefArray(v[ik], $dict, $path_i + "." + rarr.length.toString(36)));
                                    });
                                }
                                else {
                                    keys.forEach((ik) => {
                                        rarr.push(t[1] != MT.STR ? Number(ik) : ik, v[ik]);
                                    });
                                }
                                v = rarr;
                            }
                            else if (t[0] == MT.MAP) {
                                let rarr = [];
                                if (t[2].ToArray) {
                                    v.forEach((iv, ik) => {
                                        rarr.push(ik, t[2].ToRefArray(iv, $dict, $path_i + "." + rarr.length.toString(36)));
                                    });
                                }
                                else {
                                    v.forEach((iv, ik) => {
                                        rarr.push(ik, iv);
                                    });
                                }
                                v = rarr;
                            }
                            else {
                                throw new TypeError("NOT implemented:" + t[0]);
                            }
                        }
                    }
                }
                else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
                    throw new TypeError(`Decode Fail-(need require):${name}.${fields[i][0]}`);
                }
                r[i] = v;
            }
            return r;
        };
        T["FromRefArray"] = function (a, $dict = new Map(), $path = "") {
            if (a == null)
                return null;
            if (!Array.isArray(a)) {
                if (typeof a == "string" && $dict.has(a)) {
                    return $dict.get(a);
                }
                throw new TypeError(`Decode Fail-0:${name}`);
            }
            let r = new T();
            $dict.set($path, r);
            for (var i = 0; i < fields.length; i++) {
                r[fields[i][0]] = cast_field_ref(a[i], name, fields[i], $dict, $path + "." + i.toString(36));
            }
            return r;
        };
    }
    /**
     * 设置是否开启-TypedArray转array，CSharp的版本对应需要开
     */
    static OptionTypedArray(flag) {
        let arr = [
            Int8Array,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
        ];
        if (typeof BigInt != "undefined") {
            arr.push(BigInt64Array, BigUint64Array);
        }
        if (flag) {
            arr.forEach((T) => {
                T["ToArray"] = function (iarr) {
                    let rarr = new Array(iarr.length);
                    for (let i = 0; i < iarr.length; i++) {
                        rarr[i] = iarr[i];
                    }
                    return rarr;
                };
            });
        }
        else {
            arr.forEach((T) => {
                T["ToArray"] = null;
                delete T["ToArray"];
            });
        }
    }
}
//获取类型的默认值
function get_def_val(type) {
    if (Number.isInteger(type)) {
        if (type >= MT.BYTE && type <= MT.DOUBLE) {
            if (type == MT.LONG) {
                return Cast_Int64(0);
            }
            return 0;
        }
        else if (type == MT.STR) {
            return "";
        }
        else if (type == MT.BOOL) {
            return false;
        }
    }
    else if (Array.isArray(type)) {
        let a = type;
        if (a[0] == MT.ARR) {
            return [];
        }
        else if (a[0] == MT.OBJ) {
            return {};
        }
        else if (a[0] == MT.SET) {
            return new Set();
        }
        else if (a[0] == MT.MAP) {
            return new Map();
        }
    }
    else if (type.BYTES_PER_ELEMENT > 0) {
        //TypeArray
        return new type();
    }
    return null;
}
function cast_field_normal(v, typeName, fieldInfo) {
    const typeField = fieldInfo[0], type = fieldInfo[1];
    if (v == null) {
        if (MsgArray.CHECK.IN && fieldInfo[2] == 1)
            throw new TypeError(`Decode Fail-(need require):${typeName}.${typeField}`);
        if (fieldInfo.length > 3) {
            return fieldInfo[4];
        }
        return get_def_val(type);
    }
    else if (Number.isInteger(type)) {
        return cast_primitive(v, type, typeName, typeField);
    }
    else if (Array.isArray(type)) {
        if (!Array.isArray(v)) {
            cast_fail_type(typeName, typeField);
        }
        let a = type;
        if (a[0] == MT.ARR) {
            return v.map((e) => cast_or_msg(e, a[1], typeName, typeField));
        }
        else if (a[0] == MT.OBJ) {
            let rObj = {};
            for (let i = 0; i < v.length; i += 2) {
                rObj[cast_primitive(v[i], a[1], typeName, typeField)] = cast_or_msg(v[i + 1], a[2], typeName, typeField);
            }
            return rObj;
        }
        else if (a[0] == MT.SET) {
            return new Set(v.map((e) => cast_or_msg(e, a[1], typeName, typeField)));
        }
        else if (a[0] == MT.MAP) {
            let rMap = new Map();
            for (let i = 0; i < v.length; i += 2) {
                rMap.set(cast_primitive(v[i], a[1], typeName, typeField), cast_or_msg(v[i + 1], a[2], typeName, typeField));
            }
            return rMap;
        }
    }
    else if (type.BYTES_PER_ELEMENT > 0) {
        //TypeArray
        if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) {
            // normal_array, TypeArray or ArrayBuffer
            return new type(v);
        }
        else if (typeof Buffer != "undefined" && Buffer.isBuffer(v)) {
            //nodejs or fibjs
            return new type(v);
        }
        else {
            cast_fail_type(typeName, typeField);
        }
    }
    else {
        return type.FromArray(v);
    }
}
function cast_or_msg(v, type, typeName, typeField) {
    if (type < MT.OBJ) {
        return cast_primitive(v, type, typeName, typeField);
    }
    return type.FromArray(v);
}
function cast_field_ref(v, typeName, fieldInfo, $dict, $path = "") {
    const typeField = fieldInfo[0], type = fieldInfo[1];
    if (v == null) {
        if (MsgArray.CHECK.IN && fieldInfo[2] == 1)
            throw new TypeError(`Decode Fail-(need require):${typeName}.${typeField}`);
        return get_def_val(type);
    }
    else if (Number.isInteger(type)) {
        return cast_primitive(v, type, typeName, typeField);
    }
    else if (Array.isArray(type)) {
        if (!Array.isArray(v)) {
            if (typeof v == "string" && $dict.has(v)) {
                return $dict.get(v);
            }
            cast_fail_type(typeName, typeField);
        }
        let a = type, tv;
        if (a[0] == MT.ARR) {
            tv = v.map((e, ii) => cast_or_ref(e, a[1], typeName, typeField, $dict, $path + "." + ii.toString(36)));
        }
        else if (a[0] == MT.OBJ) {
            let rObj = {};
            for (let ii = 0; ii < v.length; ii += 2) {
                rObj[cast_primitive(v[ii], a[1], typeName, typeField)] = cast_or_ref(v[ii + 1], a[2], typeName, typeField, $dict, $path + "." + ii.toString(36));
            }
            tv = rObj;
        }
        else if (a[0] == MT.SET) {
            tv = new Set(v.map((e, ii) => cast_or_ref(e, a[1], typeName, typeField, $dict, $path + "." + ii.toString(36))));
        }
        else if (a[0] == MT.MAP) {
            let rMap = new Map();
            for (let ii = 0; ii < v.length; ii += 2) {
                rMap.set(cast_primitive(v[ii], a[1], typeName, typeField), cast_or_ref(v[ii + 1], a[2], typeName, typeField, $dict, $path + "." + ii.toString(36)));
            }
            tv = rMap;
        }
        $dict.set($path, tv);
        return tv;
    }
    else if (type.BYTES_PER_ELEMENT > 0) {
        //TypeArray
        if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) {
            // normal_array, TypeArray or ArrayBuffer
            return new type(v);
        }
        else if (typeof Buffer != "undefined" && Buffer.isBuffer(v)) {
            //nodejs or fibjs
            return new type(v);
        }
        else {
            cast_fail_type(typeName, typeField);
        }
    }
    else {
        return type.FromRefArray(v, $dict, $path);
    }
}
function cast_or_ref(v, type, typeName, typeField, $dict, $path) {
    if (type < MT.OBJ) {
        return cast_primitive(v, type, typeName, typeField);
    }
    return type.FromRefArray(v, $dict, $path);
}
function cast_primitive(v, type, typeName, typeField) {
    if (type == MT.LONG) {
        v = Cast_Int64(v);
    }
    else if (type >= MT.BYTE && type <= MT.DOUBLE) {
        v = Number(v);
        if (!Number.isFinite(v)) {
            cast_fail_type(typeName, typeField);
        }
    }
    else if (type == MT.BOOL) {
        v = Boolean(v);
    }
    else if (type == MT.DATE) {
        if (v instanceof Date == false) {
            cast_fail_type(typeName, typeField);
        }
    }
    else if (type == MT.STR && typeof v != "string") {
        cast_fail_type(typeName, typeField);
    }
    return v;
}
function cast_fail_type(typeName, typeField) {
    throw new TypeError(`Decode Fail-2:${typeName}.${typeField}`);
}
const FIELDS_PROPERTY_KEY = Symbol("__$FIELDS$__");
/**
 * 注解-数据类的方法
 * @param id 类消息ID
 * @param name 类消息NAME（在某些编译情况时有用）
 * @returns
 * @public
 */
function MsgClass(id, name) {
    return function (T) {
        let cname = name || T.name;
        MsgArray.MetaBind(T, id || Next_Id(cname), cname, T.prototype[FIELDS_PROPERTY_KEY] || []);
        delete T.prototype[FIELDS_PROPERTY_KEY];
    };
}
/**
 * 注解-数据类成员属性的方法
 * @param typed 成员的数据类型
 * @param required 成员是否必须要有数据（在解析时会检测）
 * @param name 成员的NAME（如果编译时擦除变量名或者需要混淆则非常有用）
 * @returns
 * @public
 */
function MsgField(typed, required = 0, name) {
    return function (target, propKey) {
        if (!target[FIELDS_PROPERTY_KEY]) {
            target[FIELDS_PROPERTY_KEY] = [];
        }
        target[FIELDS_PROPERTY_KEY].push([
            name ? name : propKey.toString(),
            typed,
            required,
        ]);
    };
}
/**
 * @public
 */
class JsonX {
    static Stringify(val, space) {
        return JSON.stringify(val, JsonReviverEncode, space);
    }
    static Parse(jsonStr) {
        return JSON.parse(jsonStr, JsonReviverDecode);
    }
}
function JsonReviverEncode(key, value) {
    if (typeof value == "bigint") {
        return {
            type: "bigint",
            data: value.toString(),
        };
    }
    else if (value instanceof Map) {
        return {
            type: "Map",
            data: Array.from(value.entries()),
        };
    }
    else if (value instanceof Set) {
        return {
            type: "Set",
            data: Array.from(value),
        };
    }
    else if (value && value.buffer instanceof ArrayBuffer) {
        return {
            type: value.constructor.name,
            data: Array.from(value),
        };
    }
    return value;
}
function JsonReviverDecode(key, value) {
    if (typeof value === "string") {
        let a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
        if (a) {
            return new Date(Date.parse(value));
        }
    }
    else if (value != null &&
        typeof value == "object" &&
        typeof value.type == "string" &&
        value.data) {
        if (value.type == "bigint") {
            return MsgArray.CastInt64(value.data);
        }
        if (value.type == "Map") {
            return new Map(value.data);
        }
        if (value.type == "Set") {
            return new Set(value.data);
        }
        if (value.type.lastIndexOf("Array") > 0) {
            return new __GLOBAL[value.type](value.data);
        }
    }
    return value;
}
//@see https://github.com/douglascrockford/JSON-js
function JsonDecycle(object) {
    var objects = new WeakMap();
    return (function derez(value, path) {
        var old_path;
        var nu;
        if (typeof value === "object" &&
            value !== null &&
            !(value instanceof Boolean) &&
            !(value instanceof Date) &&
            !(value instanceof Number) &&
            !(value instanceof RegExp) &&
            !(value instanceof String)) {
            old_path = objects.get(value);
            if (old_path !== undefined) {
                return { $ref: old_path };
            }
            objects.set(value, path);
            if (value instanceof Set) {
                value = Array.from(value);
            }
            else if (value instanceof Map) {
                var tmp = {};
                value.forEach((iv, ik) => {
                    tmp[ik] = iv;
                });
                value = tmp;
            }
            if (Array.isArray(value)) {
                nu = [];
                value.forEach(function (element, i) {
                    nu[i] = derez(element, path + "[" + i + "]");
                });
            }
            else {
                nu = {};
                Object.keys(value).forEach(function (name) {
                    nu[name] = derez(value[name], path + "[" + JSON.stringify(name) + "]");
                });
            }
            return nu;
        }
        return value;
    })(object, "$");
}
const __GLOBAL = typeof window == "object" ? window : global;

export { JsonX, MT, MsgArray, MsgClass, MsgField };
