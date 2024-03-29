'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

exports.MtBase = void 0;
(function (MtBase) {
    MtBase[MtBase["BOOL"] = 0] = "BOOL";
    MtBase[MtBase["I8"] = 1] = "I8";
    MtBase[MtBase["I16"] = 2] = "I16";
    MtBase[MtBase["I32"] = 3] = "I32";
    MtBase[MtBase["I64"] = 4] = "I64";
    MtBase[MtBase["I53"] = 5] = "I53";
    MtBase[MtBase["F32"] = 6] = "F32";
    MtBase[MtBase["F64"] = 7] = "F64";
    MtBase[MtBase["STR"] = 8] = "STR";
    MtBase[MtBase["DATE"] = 9] = "DATE";
})(exports.MtBase || (exports.MtBase = {}));
exports.MtBox = void 0;
(function (MtBox) {
    MtBox[MtBox["Obj"] = 11] = "Obj";
    MtBox[MtBox["Arr"] = 12] = "Arr";
    MtBox[MtBox["Map"] = 13] = "Map";
    MtBox[MtBox["Set"] = 14] = "Set";
})(exports.MtBox || (exports.MtBox = {}));
var _nameS = new Map();
var _idS = new Map();
var _typeS = new Map();
var Meta_ID = 1;
var Cast_Int64 = function (v) {
    return BigInt(v);
};
var MsgArray = /** @class */ (function () {
    function MsgArray() {
    }
    MsgArray.prototype.toString = function () {
        return "[Class:".concat(this.constructor.name, "]=>").concat(JsonX.Stringify(JsonDecycle(this)));
    };
    MsgArray.prototype.toArray = function ($deep) {
        return this.constructor.ToArray(this, $deep);
    };
    MsgArray.prototype.toRefArray = function () {
        return this.constructor.ToRefArray(this);
    };
    MsgArray.CastByArray = function (type, arr) {
        return type.FromArray(arr);
    };
    MsgArray.CastByRefArray = function (type, arr) {
        return type.FromRefArray(arr);
    };
    MsgArray.ToArray = function (v, $deep) {
        if (v == null)
            return null;
        return v.constructor.ToArray(v, $deep);
    };
    MsgArray.FromArray = function (a) {
        return null;
    };
    MsgArray.ToRefArray = function (v) {
        if (v == null)
            return null;
        return v.constructor.ToRefArray(v);
    };
    MsgArray.FromRefArray = function (a) {
        return null;
    };
    MsgArray.ClassByName = function (name) {
        var _a;
        return (_a = _nameS.get(name)) === null || _a === void 0 ? void 0 : _a.clazz;
    };
    MsgArray.ClassById = function (id) {
        var _a;
        return (_a = _idS.get(id)) === null || _a === void 0 ? void 0 : _a.clazz;
    };
    MsgArray.MetaByName = function (name) {
        return _nameS.get(name);
    };
    MsgArray.MetaById = function (id) {
        return _idS.get(id);
    };
    MsgArray.MetaByClass = function (T) {
        return _typeS.get(T);
    };
    MsgArray.MetaIdList = function () {
        var arr = [];
        _idS.forEach(function (v, k) {
            arr.push(k);
        });
        return arr;
        // return [..._idS.keys()];
    };
    MsgArray.MetaNameList = function () {
        var arr = [];
        _nameS.forEach(function (v, k) {
            arr.push(k);
        });
        return arr;
        // return [..._nameS.keys()];
    };
    Object.defineProperty(MsgArray, "CastInt64", {
        get: function () {
            return Cast_Int64;
        },
        set: function (fn) {
            Cast_Int64 = fn || Cast_Int64;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * 注解类属性信息的方法
     * @param info
     * @returns
     */
    MsgArray.Meta = function (info) {
        return function (T) {
            MsgArray.MetaBind(T, info.id || Meta_ID++, info.name || T.name, info.fields);
        };
    };
    /**
     * 绑定类与属性关系
     * @param T
     * @param id
     * @param name
     * @param fields
     */
    MsgArray.MetaBind = function (T, id, name, fields) {
        if (_idS.has(id) || _nameS.has(name)) {
            throw new TypeError("MsgInfo.(id or name).conflict:" + id + "_" + name);
        }
        var obj = Object.freeze({ id: id, name: name, fields: fields, clazz: T });
        _idS.set(id, obj);
        _nameS.set(name, obj);
        _typeS.set(T, obj);
        T["ToArray"] = function (a, $deep) {
            if ($deep === void 0) { $deep = 8; }
            if (a == null)
                return null;
            if ($deep < 0) {
                throw new Error("max stack limit: check circle reference");
            }
            var r = new Array(fields.length);
            var _loop_1 = function () {
                var v = a[fields[i][0]], t = fields[i][1];
                if (v) {
                    if (t.ToArray) {
                        v = t.ToArray(v, $deep - 1);
                    }
                    else if (Array.isArray(t)) {
                        if (t[0] == exports.MtBox.Arr) {
                            if (t[1].ToArray) {
                                v = v.map(function (e) { return t[1].ToArray(e, $deep - 1); });
                            }
                        }
                        else if (t[0] == exports.MtBox.Set) {
                            var rarr_1 = [];
                            if (t[1].ToArray) {
                                v.forEach(function (e) {
                                    rarr_1.push(t[1].ToArray(e, $deep - 1));
                                });
                            }
                            else {
                                v.forEach(function (e) {
                                    rarr_1.push(e);
                                });
                            }
                            v = rarr_1;
                        }
                        else if (t[0] == exports.MtBox.Obj) {
                            var rarr_2 = [], keys = Object.keys(v);
                            if (t[2].ToArray) {
                                keys.forEach(function (k) {
                                    rarr_2.push(t[1] != exports.MtBase.STR ? Number(k) : k, t[2].ToArray(v[k], $deep - 1));
                                });
                            }
                            else {
                                keys.forEach(function (k) {
                                    rarr_2.push(t[1] != exports.MtBase.STR ? Number(k) : k, v[k]);
                                });
                            }
                            v = rarr_2;
                        }
                        else if (t[0] == exports.MtBox.Map) {
                            var rarr_3 = [];
                            if (t[2].ToArray) {
                                v.forEach(function (iv, ik) {
                                    rarr_3.push(ik, t[2].ToArray(iv, $deep - 1));
                                });
                            }
                            else {
                                v.forEach(function (iv, ik) {
                                    rarr_3.push(ik, iv);
                                });
                            }
                            v = rarr_3;
                        }
                        else {
                            throw new TypeError("NOT implemented:" + t[0]);
                        }
                    }
                }
                else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
                    throw new TypeError("Decode Fail-(need require):".concat(name, ".").concat(fields[i][0]));
                }
                r[i] = v;
            };
            for (var i = 0; i < r.length; i++) {
                _loop_1();
            }
            return r;
        };
        T["FromArray"] = function (a) {
            if (a == null)
                return null;
            if (!Array.isArray(a))
                throw new TypeError("Decode Fail-0:".concat(name));
            var r = new T();
            for (var i = 0; i < fields.length; i++) {
                r[fields[i][0]] = cast_field_normal(a[i], name, fields[i]);
            }
            return r;
        };
        T["ToRefArray"] = function (a, $dict, $path) {
            if ($dict === void 0) { $dict = new Map(); }
            if ($path === void 0) { $path = ""; }
            if (a == null)
                return null;
            if ($dict.has(a)) {
                return $dict.get(a);
            }
            $dict.set(a, $path);
            var r = new Array(fields.length);
            var _loop_2 = function () {
                var v = a[fields[i][0]], t = fields[i][1], $path_i = $path + "." + i.toString(36);
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
                            if (t[0] == exports.MtBox.Arr) {
                                if (t[1].ToArray) {
                                    v = v.map(function (e, ii) { return t[1].ToRefArray(e, $dict, $path_i + "." + ii.toString(36)); });
                                }
                            }
                            else if (t[0] == exports.MtBox.Set) {
                                var rarr_4 = [];
                                if (t[1].ToArray) {
                                    v.forEach(function (e, ii) {
                                        rarr_4.push(t[1].ToRefArray(e, $dict, $path_i + "." + ii.toString(36)));
                                    });
                                }
                                else {
                                    v.forEach(function (e) {
                                        rarr_4.push(e);
                                    });
                                }
                                v = rarr_4;
                            }
                            else if (t[0] == exports.MtBox.Obj) {
                                var rarr_5 = [], keys = Object.keys(v);
                                if (t[2].ToArray) {
                                    keys.forEach(function (ik) {
                                        rarr_5.push(t[1] != exports.MtBase.STR ? Number(ik) : ik, t[2].ToRefArray(v[ik], $dict, $path_i + "." + rarr_5.length.toString(36)));
                                    });
                                }
                                else {
                                    keys.forEach(function (ik) {
                                        rarr_5.push(t[1] != exports.MtBase.STR ? Number(ik) : ik, v[ik]);
                                    });
                                }
                                v = rarr_5;
                            }
                            else if (t[0] == exports.MtBox.Map) {
                                var rarr_6 = [];
                                if (t[2].ToArray) {
                                    v.forEach(function (iv, ik) {
                                        rarr_6.push(ik, t[2].ToRefArray(iv, $dict, $path_i + "." + rarr_6.length.toString(36)));
                                    });
                                }
                                else {
                                    v.forEach(function (iv, ik) {
                                        rarr_6.push(ik, iv);
                                    });
                                }
                                v = rarr_6;
                            }
                            else {
                                throw new TypeError("NOT implemented:" + t[0]);
                            }
                        }
                    }
                }
                else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
                    throw new TypeError("Decode Fail-(need require):".concat(name, ".").concat(fields[i][0]));
                }
                r[i] = v;
            };
            for (var i = 0; i < r.length; i++) {
                _loop_2();
            }
            return r;
        };
        T["FromRefArray"] = function (a, $dict, $path) {
            if ($dict === void 0) { $dict = new Map(); }
            if ($path === void 0) { $path = ""; }
            if (a == null)
                return null;
            if (!Array.isArray(a)) {
                if (typeof (a) == "string" && $dict.has(a)) {
                    return $dict.get(a);
                }
                throw new TypeError("Decode Fail-0:".concat(name));
            }
            var r = new T();
            $dict.set($path, r);
            for (var i = 0; i < fields.length; i++) {
                r[fields[i][0]] = cast_field_ref(a[i], name, fields[i], $dict, $path + "." + i.toString(36));
            }
            return r;
        };
    };
    /**
     * 设置是否开启-TypedArray转array，CSharp的版本对应需要开
     * @param flag
     */
    MsgArray.OptionTypedArray = function (flag) {
        var arr = [Int8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
        if (typeof (BigInt) != "undefined") {
            arr.push(BigInt64Array, BigUint64Array);
        }
        if (flag) {
            arr.forEach(function (T) {
                T["ToArray"] = function (iarr) {
                    var rarr = new Array(iarr.length);
                    for (var i = 0; i < iarr.length; i++) {
                        rarr[i] = iarr[i];
                    }
                    return rarr;
                };
            });
        }
        else {
            arr.forEach(function (T) {
                T["ToArray"] = null;
                delete T["ToArray"];
            });
        }
    };
    MsgArray.CHECK = { OUT: false, IN: true };
    return MsgArray;
}());
function get_def_val(type) {
    if (Number.isInteger(type)) {
        if (type >= exports.MtBase.I8 && type <= exports.MtBase.F64) {
            if (type == exports.MtBase.I64) {
                return Cast_Int64(0);
            }
            return 0;
        }
        else if (type == exports.MtBase.STR) {
            return "";
        }
    }
    else if (Array.isArray(type)) {
        var a = type;
        if (a[0] == exports.MtBox.Arr) {
            return [];
        }
        else if (a[0] == exports.MtBox.Obj) {
            return {};
        }
        else if (a[0] == exports.MtBox.Set) {
            return new Set();
        }
        else if (a[0] == exports.MtBox.Map) {
            return new Map();
        }
    }
    else if (type.BYTES_PER_ELEMENT > 0) { //TypeArray
        return new type();
    }
    return null;
}
function cast_field_normal(v, typeName, fieldInfo) {
    var typeField = fieldInfo[0], type = fieldInfo[1];
    if (v == null) {
        if (MsgArray.CHECK.IN && fieldInfo[2] == 1)
            throw new TypeError("Decode Fail-(need require):".concat(typeName, ".").concat(typeField));
        return get_def_val(type);
    }
    else if (Number.isInteger(type)) {
        return cast_primitive(v, type, typeName, typeField);
    }
    else if (Array.isArray(type)) {
        if (!Array.isArray(v)) {
            cast_fail_type(typeName, typeField);
        }
        var a_1 = type;
        if (a_1[0] == exports.MtBox.Arr) {
            return v.map(function (e) { return cast_or_msg(e, a_1[1], typeName, typeField); });
        }
        else if (a_1[0] == exports.MtBox.Obj) {
            var rObj = {};
            for (var i = 0; i < v.length; i += 2) {
                rObj[cast_primitive(v[i], a_1[1], typeName, typeField)] = cast_or_msg(v[i + 1], a_1[2], typeName, typeField);
            }
            return rObj;
        }
        else if (a_1[0] == exports.MtBox.Set) {
            return new Set(v.map(function (e) { return cast_or_msg(e, a_1[1], typeName, typeField); }));
        }
        else if (a_1[0] == exports.MtBox.Map) {
            var rMap = new Map();
            for (var i = 0; i < v.length; i += 2) {
                rMap.set(cast_primitive(v[i], a_1[1], typeName, typeField), cast_or_msg(v[i + 1], a_1[2], typeName, typeField));
            }
            return rMap;
        }
    }
    else if (type.BYTES_PER_ELEMENT > 0) { //TypeArray
        if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) { // normal_array, TypeArray or ArrayBuffer
            return new type(v);
        }
        else if (typeof (Buffer) != "undefined" && Buffer.isBuffer(v)) { //nodejs or fibjs
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
    if (exports.MtBase[type]) {
        return cast_primitive(v, type, typeName, typeField);
    }
    return type.FromArray(v);
}
function cast_field_ref(v, typeName, fieldInfo, $dict, $path) {
    if ($path === void 0) { $path = ""; }
    var typeField = fieldInfo[0], type = fieldInfo[1];
    if (v == null) {
        if (MsgArray.CHECK.IN && fieldInfo[2] == 1)
            throw new TypeError("Decode Fail-(need require):".concat(typeName, ".").concat(typeField));
        return get_def_val(type);
    }
    else if (Number.isInteger(type)) {
        return cast_primitive(v, type, typeName, typeField);
    }
    else if (Array.isArray(type)) {
        if (!Array.isArray(v)) {
            if (typeof (v) == "string" && $dict.has(v)) {
                return $dict.get(v);
            }
            cast_fail_type(typeName, typeField);
        }
        var a_2 = type, tv = void 0;
        if (a_2[0] == exports.MtBox.Arr) {
            tv = v.map(function (e, ii) { return cast_or_ref(e, a_2[1], typeName, typeField, $dict, $path + "." + ii.toString(36)); });
        }
        else if (a_2[0] == exports.MtBox.Obj) {
            var rObj = {};
            for (var ii = 0; ii < v.length; ii += 2) {
                rObj[cast_primitive(v[ii], a_2[1], typeName, typeField)] = cast_or_ref(v[ii + 1], a_2[2], typeName, typeField, $dict, $path + "." + ii.toString(36));
            }
            tv = rObj;
        }
        else if (a_2[0] == exports.MtBox.Set) {
            tv = new Set(v.map(function (e, ii) { return cast_or_ref(e, a_2[1], typeName, typeField, $dict, $path + "." + ii.toString(36)); }));
        }
        else if (a_2[0] == exports.MtBox.Map) {
            var rMap = new Map();
            for (var ii = 0; ii < v.length; ii += 2) {
                rMap.set(cast_primitive(v[ii], a_2[1], typeName, typeField), cast_or_ref(v[ii + 1], a_2[2], typeName, typeField, $dict, $path + "." + ii.toString(36)));
            }
            tv = rMap;
        }
        $dict.set($path, tv);
        return tv;
    }
    else if (type.BYTES_PER_ELEMENT > 0) { //TypeArray
        if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) { // normal_array, TypeArray or ArrayBuffer
            return new type(v);
        }
        else if (typeof (Buffer) != "undefined" && Buffer.isBuffer(v)) { //nodejs or fibjs
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
    if (exports.MtBase[type]) {
        return cast_primitive(v, type, typeName, typeField);
    }
    return type.FromRefArray(v, $dict, $path);
}
function cast_primitive(v, type, typeName, typeField) {
    if (type == exports.MtBase.I64) {
        v = Cast_Int64(v);
    }
    else if (type >= exports.MtBase.I8 && type <= exports.MtBase.F64) {
        v = Number(v);
        if (!Number.isFinite(v)) {
            cast_fail_type(typeName, typeField);
        }
    }
    else if (type == exports.MtBase.BOOL) {
        v = Boolean(v);
    }
    else if (type == exports.MtBase.DATE) {
        if (v instanceof Date == false) {
            cast_fail_type(typeName, typeField);
        }
    }
    else if (type == exports.MtBase.STR && typeof (v) != "string") {
        cast_fail_type(typeName, typeField);
    }
    return v;
}
function cast_fail_type(typeName, typeField) {
    throw new TypeError("Decode Fail-2:".concat(typeName, ".").concat(typeField));
}
var __MSG_FIELDS_PROPERTY_KEY = "__$FIELDS$__";
/**
 * 注解-数据类的方法
 * @param id 类消息ID
 * @param name 类消息NAME（在某些编译情况时有用）
 * @returns
 */
function MsgClass(id, name) {
    return function (T) {
        MsgArray.MetaBind(T, id || Meta_ID++, name || T.name, T.prototype[__MSG_FIELDS_PROPERTY_KEY] || []);
        delete T.prototype[__MSG_FIELDS_PROPERTY_KEY];
    };
}
/**
 * 注解-数据类成员属性的方法
 * @param typed 成员的数据类型
 * @param required 成员是否必须要有数据（在解析时会检测）
 * @param name 成员的NAME（在某些编译情况时有用）
 * @returns
 */
function MsgField(typed, required, name) {
    if (required === void 0) { required = 0; }
    return function (target, propKey) {
        if (!target[__MSG_FIELDS_PROPERTY_KEY]) {
            target[__MSG_FIELDS_PROPERTY_KEY] = [];
        }
        target[__MSG_FIELDS_PROPERTY_KEY].push([name ? name : propKey.toString(), typed, required]);
    };
}
var JsonX = /** @class */ (function () {
    function JsonX() {
    }
    JsonX.Stringify = function (val, space) {
        return JSON.stringify(val, JsonReviverEncode, space);
    };
    JsonX.Parse = function (jsonStr) {
        return JSON.parse(jsonStr, JsonReviverDecode);
    };
    return JsonX;
}());
function JsonReviverEncode(key, value) {
    if (typeof (value) == "bigint") {
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
    if (typeof value === 'string') {
        var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
        if (a) {
            return new Date(Date.parse(value));
        }
    }
    else if (value != null && typeof (value) == "object" && typeof (value.type) == "string" && value.data) {
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
        if (typeof value === "object"
            && value !== null
            && !(value instanceof Boolean)
            && !(value instanceof Date)
            && !(value instanceof Number)
            && !(value instanceof RegExp)
            && !(value instanceof String)) {
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
                value.forEach(function (iv, ik) {
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
    }(object, "$"));
}
var __GLOBAL = typeof (window) == "object" ? window : global;

exports.JsonX = JsonX;
exports.MsgArray = MsgArray;
exports.MsgClass = MsgClass;
exports.MsgField = MsgField;
