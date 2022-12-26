var MType;
(function (MType) {
    MType[MType["BOOL"] = 0] = "BOOL";
    MType[MType["I8"] = 1] = "I8";
    MType[MType["I16"] = 2] = "I16";
    MType[MType["I32"] = 3] = "I32";
    MType[MType["I64"] = 4] = "I64";
    MType[MType["I53"] = 5] = "I53";
    MType[MType["F32"] = 6] = "F32";
    MType[MType["F64"] = 7] = "F64";
    MType[MType["STR"] = 8] = "STR";
    MType[MType["DATE"] = 9] = "DATE";
})(MType || (MType = {}));
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
    MsgArray.prototype.toArray = function () {
        return this.constructor["ToArray"](this);
    };
    MsgArray.ToArray = function (v) {
        if (v == null)
            return null;
        return v.constructor["ToArray"](v);
    };
    MsgArray.FromArray = function (a) {
        return null;
    };
    MsgArray.CastByArray = function (type, arr) {
        return type["FromArray"](arr);
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
        T.prototype.toArray = function () {
            return T["ToArray"](this);
        };
        T.prototype.toString = function () {
            return "[Class:".concat(name, "]=>").concat(JsonX.Stringify(this));
        };
        T["ToArray"] = function (a, $deep) {
            if ($deep === void 0) { $deep = -1; }
            if (a == null)
                return null;
            if ($deep > MsgArray.MAX_DEEP) {
                throw new Error("max stack limit: check circle reference");
            }
            var r = new Array(fields.length);
            var _loop_1 = function () {
                var v = a[fields[i][0]], t = fields[i][1];
                if (v) {
                    if (t.ToArray) {
                        v = t.ToArray(v, $deep + 1);
                    }
                    else if (Array.isArray(t)) {
                        if (t[0] == "Arr") {
                            if (t[1].ToArray) {
                                v = v.map(function (e) { return t[1].ToArray(e, $deep + 1); });
                            }
                        }
                        else if (t[0] == "Set") {
                            var rarr_1 = [];
                            if (t[1].ToArray) {
                                v.forEach(function (e) {
                                    rarr_1.push(t[1].ToArray(e, $deep + 1));
                                });
                            }
                            else {
                                v.forEach(function (e) {
                                    rarr_1.push(e);
                                });
                            }
                            v = rarr_1;
                        }
                        else if (t[0] == "Obj") {
                            var rarr_2 = [], keys = Object.keys(v);
                            if (t[2].ToArray) {
                                keys.forEach(function (k) {
                                    rarr_2.push(t[1] != MType.STR ? Number(k) : k, t[2].ToArray(v[k], $deep + 1));
                                });
                            }
                            else {
                                keys.forEach(function (k) {
                                    rarr_2.push(t[1] != MType.STR ? Number(k) : k, v[k]);
                                });
                            }
                            v = rarr_2;
                        }
                        else if (t[0] == "Map") {
                            var rarr_3 = [];
                            if (t[2].ToArray) {
                                v.forEach(function (iv, ik) {
                                    rarr_3.push(ik, t[2].ToArray(iv, $deep + 1));
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
                r[fields[i][0]] = cast_val_field(a[i], name, fields[i]);
            }
            return r;
        };
    };
    /**
     * 设置是否开启-TypedArray转array
     * @param flag
     */
    MsgArray.ConfigTypedArray = function (flag) {
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
    MsgArray.MAX_DEEP = 32;
    return MsgArray;
}());
function cast_val_field(v, typeName, fieldInfo) {
    var typeField = fieldInfo[0], type = fieldInfo[1];
    if (v === undefined || v === null) {
        if (fieldInfo[2] == 1)
            throw new TypeError("Decode Fail-(need require):".concat(typeName, ".").concat(typeField));
        if (Number.isInteger(type)) {
            if (type >= MType.I8 && type <= MType.F64) {
                if (type == MType.I64) {
                    return Cast_Int64(0);
                }
                return 0;
            }
            else if (type == MType.STR) {
                return "";
            }
        }
        else if (Array.isArray(type)) {
            var a = type;
            if (a[0] == "Arr") {
                return [];
            }
            else if (a[0] == "Obj") {
                return {};
            }
            else if (a[0] == "Set") {
                return new Set();
            }
            else if (a[0] == "Map") {
                return new Map();
            }
        }
        else if (type["BYTES_PER_ELEMENT"] > 0) { //TypeArray
            return new type();
        }
        return v;
    }
    else if (Number.isInteger(type)) {
        return cast_primitive(v, type, typeName, typeField);
    }
    else if (Array.isArray(type)) {
        if (!Array.isArray(v)) {
            cast_fail_type(typeName, typeField);
        }
        var a_1 = type;
        if (a_1[0] == "Arr") {
            return v.map(function (e) { return cast_or_msg(e, a_1[1], typeName, typeField); });
        }
        else if (a_1[0] == "Obj") {
            var rObj = {};
            for (var i = 0; i < v.length; i += 2) {
                rObj[cast_primitive(v[i], a_1[1], typeName, typeField)] = cast_or_msg(v[i + 1], a_1[2], typeName, typeField);
            }
            return rObj;
        }
        else if (a_1[0] == "Set") {
            return new Set(v.map(function (e) { return cast_or_msg(e, a_1[1], typeName, typeField); }));
        }
        else if (a_1[0] == "Map") {
            var rMap = new Map();
            for (var i = 0; i < v.length; i += 2) {
                rMap.set(cast_primitive(v[i], a_1[1], typeName, typeField), cast_or_msg(v[i + 1], a_1[2], typeName, typeField));
            }
            return rMap;
        }
    }
    else if (type["BYTES_PER_ELEMENT"] > 0) { //TypeArray
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
    if (MType[type]) {
        return cast_primitive(v, type, typeName, typeField);
    }
    return type.FromArray(v);
}
function cast_primitive(v, type, typeName, typeField) {
    if (type == MType.I64) {
        v = Cast_Int64(v);
    }
    else if (type >= MType.I8 && type <= MType.F64) {
        v = Number(v);
        if (!Number.isFinite(v)) {
            cast_fail_type(typeName, typeField);
        }
    }
    else if (type == MType.BOOL) {
        v = Boolean(v);
    }
    else if (type == MType.DATE) {
        if (v instanceof Date == false) {
            cast_fail_type(typeName, typeField);
        }
    }
    else if (type == MType.STR && typeof (v) != "string") {
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
    else if (typeof (value) == "object" && typeof (value.type) == "string" && value.data) {
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
var __GLOBAL = typeof (window) == "object" ? window : global;

export { JsonX, MType, MsgArray, MsgClass, MsgField };
