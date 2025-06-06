export type NewableAny = { new (...params: any[]): any };
export type Newable<T> = { new (...params: any[]): T };

/**
 * 类型定义
 * @public
 */
export enum MT {
  BOOL,
  BYTE,
  SHORT,
  INT,
  LONG,
  I53,
  FLOAT,
  DOUBLE,
  STR,
  DATE,
  OBJ,
  ARR,
  MAP,
  SET,
}
export type MtBase =
  | MT.BOOL
  | MT.BYTE
  | MT.SHORT
  | MT.INT
  | MT.LONG
  | MT.I53
  | MT.FLOAT
  | MT.DOUBLE
  | MT.STR
  | MT.DATE;
export type MtBox = MT.OBJ | MT.ARR | MT.MAP | MT.SET;
export type MtKey = MT.BYTE | MT.SHORT | MT.INT | MT.I53 | MT.LONG | MT.STR;

// export type PrimitiveArr = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
export type MetaType =
  | MtBase
  | [MtBox, MtBase | NewableAny]
  | [MtBox, MtKey, MtBase | NewableAny]
  | [MtBox, MtBase | NewableAny]
  | [MtBox, MtKey, MtBase | NewableAny]
  | ArrayBufferView
  | NewableAny;

export type MetaInfoFieldRequired = 0 | 1;
export type MetaInfoField =
  | [string, MetaType, MetaInfoFieldRequired]
  | [string, MetaType, MetaInfoFieldRequired, any]; // | [string, MsgType, Required];
export type MetaInfoObj = {
  id: number;
  name: string;
  fields: Array<MetaInfoField>;
  clazz: NewableAny;
};
const _nameS: Map<string, MetaInfoObj> = new Map();
const _idS: Map<number, MetaInfoObj> = new Map();
const _typeS: Map<NewableAny, MetaInfoObj> = new Map();

let Meta_ID = 0;
let Next_Id: (name: string) => number = (name: string) => {
  return --Meta_ID;
};
let Cast_Int64: (v: any) => any = (v: any) => {
  return BigInt(v);
};

/**
 * 消息数组基类
 * @public
 */
export abstract class MsgArray {
  public static CHECK = { OUT: false, IN: true };

  public toString() {
    return `[Class:${this.constructor.name}]=>${JsonX.Stringify(
      JsonDecycle(this)
    )}`;
  }
  public toArray($deep?: number): any[] {
    return (<any>this.constructor).ToArray(this, $deep);
  }
  public toRefArray(): any[] {
    return (<any>this.constructor).ToRefArray(this);
  }

  public static CastByArray<T>(type: Newable<T>, arr: any[]): T {
    return (<any>type).FromArray(arr);
  }
  public static CastByRefArray<T>(type: Newable<T>, arr: any[]): T {
    return (<any>type).FromRefArray(arr);
  }

  public static ToArray<T>(v: T, $deep?: number): any[] | null {
    if (v == null) return null;
    return (<any>v.constructor).ToArray(v, $deep);
  }
  public static FromArray<T>(a: any[]): T {
    return <T>(<unknown>null);
  }
  public static ToRefArray<T>(v: T): any[] | null {
    if (v == null) return null;
    return (<any>v.constructor).ToRefArray(v);
  }
  public static FromRefArray<T>(a: any[]): T {
    return <T>(<unknown>null);
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
  public static set CastInt64(fn: (v: any) => any) {
    Cast_Int64 = fn || Cast_Int64;
  }
  public static get CastInt64(): (v: any) => any {
    return Cast_Int64;
  }
  public static set NextId(fn: (name: string) => number) {
    Next_Id = fn || Next_Id;
  }

  /**
   * 注解类属性信息的方法
   */
  public static Meta(info: {
    id?: number;
    name?: string;
    fields: Array<MetaInfoField>;
  }): ClassDecorator {
    return function (T: any) {
      let cname = info.name || T.name;
      MsgArray.MetaBind(T, info.id || Next_Id(cname), cname, info.fields);
    };
  }
  /**
   * 绑定类与属性关系
   */
  public static MetaBind(
    T: NewableAny,
    id: number,
    name: string,
    fields: Array<MetaInfoField>
  ) {
    if (_idS.has(id) || _nameS.has(name)) {
      throw new TypeError("MsgInfo.(id or name).conflict:" + id + "_" + name);
    }
    const obj = Object.freeze({ id, name, fields, clazz: T });
    _idS.set(id, obj);
    _nameS.set(name, obj);
    _typeS.set(T, obj);
    (<any>T)["ToJSON"] = function (a: any, $deep: number = 8): any {
      if (a == null) return <any>(<unknown>null);
      if ($deep < 0) {
        throw new Error("max stack limit: check circle reference");
      }
      let r: any = {};
      for (var i = 0; i < fields.length; i++) {
        let f = fields[i];
        let v = a[f[0]],
          t: any = f[1];
        if (v) {
          if (t.ToJSON) {
            v = t.ToJSON(v, $deep - 1);
          }
        } else if (Array.isArray(t)) {
          if (t[0] == MT.ARR) {
            if (t[1].ToJSON) {
              v = v.map((e: any) => t[1].ToJSON(e, $deep - 1));
            }
          } else if (t[0] == MT.SET) {
            let rarr: any[] = [];
            if (t[1].ToJSON) {
              v.forEach((e: any) => {
                rarr.push(t[1].ToJSON(e, $deep - 1));
              });
            } else {
              v.forEach((e: any) => {
                rarr.push(e);
              });
            }
            v = rarr;
          } else if (t[0] == MT.OBJ) {
            let rarr: any[] = [],
              keys = Object.keys(v);
            if (t[2].ToJSON) {
              keys.forEach((k) => {
                rarr.push(
                  t[1] != MT.STR ? Number(k) : k,
                  t[2].ToJSON(v[k], $deep - 1)
                );
              });
            } else {
              keys.forEach((k) => {
                rarr.push(t[1] != MT.STR ? Number(k) : k, v[k]);
              });
            }
            v = rarr;
          } else if (t[0] == MT.MAP) {
            let rarr: any[] = [];
            if (t[2].ToJSON) {
              v.forEach((iv: any, ik: any) => {
                rarr.push(ik, t[2].ToJSON(iv, $deep - 1));
              });
            } else {
              v.forEach((iv: any, ik: any) => {
                rarr.push(ik, iv);
              });
            }
            v = rarr;
          } else {
            throw new TypeError("NOT implemented:" + t[0]);
          }
        } else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
          throw new TypeError(
            `Decode Fail-(need require):${name}.${fields[i][0]}`
          );
        }
        r[f[0]] = v;
      }
      return r;
    };
    (<any>T)["ToArray"] = function (a: any, $deep: number = 8): any[] {
      if (a == null) return <any[]>(<unknown>null);
      if ($deep < 0) {
        throw new Error("max stack limit: check circle reference");
      }
      let r = new Array(fields.length);
      for (var i = 0; i < r.length; i++) {
        let v = a[fields[i][0]],
          t: any = fields[i][1];
        if (v) {
          if (t.ToArray) {
            v = t.ToArray(v, $deep - 1);
          } else if (Array.isArray(t)) {
            if (t[0] == MT.ARR) {
              if (t[1].ToArray) {
                v = v.map((e: any) => t[1].ToArray(e, $deep - 1));
              }
            } else if (t[0] == MT.SET) {
              let rarr: any[] = [];
              if (t[1].ToArray) {
                v.forEach((e: any) => {
                  rarr.push(t[1].ToArray(e, $deep - 1));
                });
              } else {
                v.forEach((e: any) => {
                  rarr.push(e);
                });
              }
              v = rarr;
            } else if (t[0] == MT.OBJ) {
              let rarr: any[] = [],
                keys = Object.keys(v);
              if (t[2].ToArray) {
                keys.forEach((k) => {
                  rarr.push(
                    t[1] != MT.STR ? Number(k) : k,
                    t[2].ToArray(v[k], $deep - 1)
                  );
                });
              } else {
                keys.forEach((k) => {
                  rarr.push(t[1] != MT.STR ? Number(k) : k, v[k]);
                });
              }
              v = rarr;
            } else if (t[0] == MT.MAP) {
              let rarr: any[] = [];
              if (t[2].ToArray) {
                v.forEach((iv: any, ik: any) => {
                  rarr.push(ik, t[2].ToArray(iv, $deep - 1));
                });
              } else {
                v.forEach((iv: any, ik: any) => {
                  rarr.push(ik, iv);
                });
              }
              v = rarr;
            } else {
              throw new TypeError("NOT implemented:" + t[0]);
            }
          }
        } else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
          throw new TypeError(
            `Decode Fail-(need require):${name}.${fields[i][0]}`
          );
        }
        r[i] = v;
      }
      return r;
    };
    (<any>T)["FromArray"] = function (a: any[]): any {
      if (a == null) return null;
      if (!Array.isArray(a)) throw new TypeError(`Decode Fail-0:${name}`);
      let r = new T();
      for (var i = 0; i < fields.length; i++) {
        r[fields[i][0]] = cast_field_normal(a[i], name, fields[i]);
      }
      return r;
    };

    (<any>T)["ToRefArray"] = function (
      a: any,
      $dict = new Map(),
      $path = ""
    ): any[] {
      if (a == null) return <any[]>(<unknown>null);
      if ($dict.has(a)) {
        return $dict.get(a);
      }
      $dict.set(a, $path);
      let r = new Array(fields.length);
      for (var i = 0; i < r.length; i++) {
        let v = a[fields[i][0]],
          t: any = fields[i][1],
          $path_i = $path + "." + i.toString(36);
        if (v) {
          if (t.ToArray) {
            v = t.ToRefArray(v, $dict, $path_i);
          } else if (Array.isArray(t)) {
            if ($dict.has(v)) {
              v = $dict.get(v);
            } else {
              $dict.set(v, $path_i);
              if (t[0] == MT.ARR) {
                if (t[1].ToArray) {
                  v = v.map((e: any, ii: number) =>
                    t[1].ToRefArray(e, $dict, $path_i + "." + ii.toString(36))
                  );
                }
              } else if (t[0] == MT.SET) {
                let rarr: any[] = [];
                if (t[1].ToArray) {
                  v.forEach((e: any, ii: number) => {
                    rarr.push(
                      t[1].ToRefArray(e, $dict, $path_i + "." + ii.toString(36))
                    );
                  });
                } else {
                  v.forEach((e: any) => {
                    rarr.push(e);
                  });
                }
                v = rarr;
              } else if (t[0] == MT.OBJ) {
                let rarr: any[] = [],
                  keys = Object.keys(v);
                if (t[2].ToArray) {
                  keys.forEach((ik) => {
                    rarr.push(
                      t[1] != MT.STR ? Number(ik) : ik,
                      t[2].ToRefArray(
                        v[ik],
                        $dict,
                        $path_i + "." + rarr.length.toString(36)
                      )
                    );
                  });
                } else {
                  keys.forEach((ik) => {
                    rarr.push(t[1] != MT.STR ? Number(ik) : ik, v[ik]);
                  });
                }
                v = rarr;
              } else if (t[0] == MT.MAP) {
                let rarr: any[] = [];
                if (t[2].ToArray) {
                  v.forEach((iv: any, ik: any) => {
                    rarr.push(
                      ik,
                      t[2].ToRefArray(
                        iv,
                        $dict,
                        $path_i + "." + rarr.length.toString(36)
                      )
                    );
                  });
                } else {
                  v.forEach((iv: any, ik: any) => {
                    rarr.push(ik, iv);
                  });
                }
                v = rarr;
              } else {
                throw new TypeError("NOT implemented:" + t[0]);
              }
            }
          }
        } else if (MsgArray.CHECK.OUT && fields[i][2] == 1) {
          throw new TypeError(
            `Decode Fail-(need require):${name}.${fields[i][0]}`
          );
        }
        r[i] = v;
      }
      return r;
    };
    (<any>T)["FromRefArray"] = function (
      a: any[],
      $dict = new Map(),
      $path = ""
    ): any {
      if (a == null) return null;
      if (!Array.isArray(a)) {
        if (typeof a == "string" && $dict.has(a)) {
          return $dict.get(a);
        }
        throw new TypeError(`Decode Fail-0:${name}`);
      }
      let r = new T();
      $dict.set($path, r);
      for (var i = 0; i < fields.length; i++) {
        r[fields[i][0]] = cast_field_ref(
          a[i],
          name,
          fields[i],
          $dict,
          $path + "." + i.toString(36)
        );
      }
      return r;
    };
  }

  /**
   * 设置是否开启-TypedArray转array，CSharp的版本对应需要开
   */
  public static OptionTypedArray(flag: boolean) {
    let arr: any[] = [
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
        T["ToArray"] = function (iarr: any) {
          let rarr = new Array(iarr.length);
          for (let i = 0; i < iarr.length; i++) {
            rarr[i] = iarr[i];
          }
          return rarr;
        };
      });
    } else {
      arr.forEach((T) => {
        T["ToArray"] = null;
        delete T["ToArray"];
      });
    }
  }
}
//获取类型的默认值
function get_def_val(type: MetaType) {
  if (Number.isInteger(type)) {
    if (<number>type >= MT.BYTE && <number>type <= MT.DOUBLE) {
      if (type == MT.LONG) {
        return Cast_Int64(0);
      }
      return 0;
    } else if (type == MT.STR) {
      return "";
    } else if (type == MT.BOOL) {
      return false;
    }
  } else if (Array.isArray(type)) {
    let a = <any[]>type;
    if (a[0] == MT.ARR) {
      return [];
    } else if (a[0] == MT.OBJ) {
      return {};
    } else if (a[0] == MT.SET) {
      return new Set();
    } else if (a[0] == MT.MAP) {
      return new Map();
    }
  } else if ((<any>type).BYTES_PER_ELEMENT > 0) {
    //TypeArray
    return new (<any>type)();
  }
  return null;
}
function cast_field_normal(v: any, typeName: string, fieldInfo: MetaInfoField) {
  const typeField = fieldInfo[0],
    type = fieldInfo[1];
  if (v == null) {
    if (MsgArray.CHECK.IN && fieldInfo[2] == 1)
      throw new TypeError(
        `Decode Fail-(need require):${typeName}.${typeField}`
      );
    if (fieldInfo.length > 3) {
      return (<any[]>fieldInfo)[4];
    }
    return get_def_val(type);
  } else if (Number.isInteger(type)) {
    return cast_primitive(v, <MtBase>type, typeName, typeField);
  } else if (Array.isArray(type)) {
    if (!Array.isArray(v)) {
      cast_fail_type(typeName, typeField);
    }
    let a = <any[]>type;
    if (a[0] == MT.ARR) {
      return v.map((e: any) => cast_or_msg(e, a[1], typeName, typeField));
    } else if (a[0] == MT.OBJ) {
      let rObj: any = {};
      for (let i = 0; i < v.length; i += 2) {
        rObj[cast_primitive(v[i], a[1], typeName, typeField)] = cast_or_msg(
          v[i + 1],
          a[2],
          typeName,
          typeField
        );
      }
      return rObj;
    } else if (a[0] == MT.SET) {
      return new Set(
        v.map((e: any) => cast_or_msg(e, a[1], typeName, typeField))
      );
    } else if (a[0] == MT.MAP) {
      let rMap = new Map();
      for (let i = 0; i < v.length; i += 2) {
        rMap.set(
          cast_primitive(v[i], a[1], typeName, typeField),
          cast_or_msg(v[i + 1], a[2], typeName, typeField)
        );
      }
      return rMap;
    }
  } else if ((<any>type).BYTES_PER_ELEMENT > 0) {
    //TypeArray
    if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) {
      // normal_array, TypeArray or ArrayBuffer
      return new (<any>type)(v);
    } else if (typeof Buffer != "undefined" && Buffer.isBuffer(v)) {
      //nodejs or fibjs
      return new (<any>type)(v);
    } else {
      cast_fail_type(typeName, typeField);
    }
  } else {
    return (<any>type).FromArray(v);
  }
}
function cast_or_msg(
  v: any,
  type: MtBase | NewableAny,
  typeName: string,
  typeField: string
) {
  if (<MtBase>type < MT.OBJ) {
    return cast_primitive(v, <MtBase>type, typeName, typeField);
  }
  return (<any>type).FromArray(v);
}

function cast_field_ref(
  v: any,
  typeName: string,
  fieldInfo: MetaInfoField,
  $dict: Map<string, any>,
  $path = ""
) {
  const typeField = fieldInfo[0],
    type = fieldInfo[1];
  if (v == null) {
    if (MsgArray.CHECK.IN && fieldInfo[2] == 1)
      throw new TypeError(
        `Decode Fail-(need require):${typeName}.${typeField}`
      );
    return get_def_val(type);
  } else if (Number.isInteger(type)) {
    return cast_primitive(v, <MtBase>type, typeName, typeField);
  } else if (Array.isArray(type)) {
    if (!Array.isArray(v)) {
      if (typeof v == "string" && $dict.has(v)) {
        return $dict.get(v);
      }
      cast_fail_type(typeName, typeField);
    }
    let a = <any[]>type,
      tv: any;
    if (a[0] == MT.ARR) {
      tv = v.map((e: any, ii: number) =>
        cast_or_ref(
          e,
          a[1],
          typeName,
          typeField,
          $dict,
          $path + "." + ii.toString(36)
        )
      );
    } else if (a[0] == MT.OBJ) {
      let rObj: any = {};
      for (let ii = 0; ii < v.length; ii += 2) {
        rObj[cast_primitive(v[ii], a[1], typeName, typeField)] = cast_or_ref(
          v[ii + 1],
          a[2],
          typeName,
          typeField,
          $dict,
          $path + "." + ii.toString(36)
        );
      }
      tv = rObj;
    } else if (a[0] == MT.SET) {
      tv = new Set(
        v.map((e: any, ii: number) =>
          cast_or_ref(
            e,
            a[1],
            typeName,
            typeField,
            $dict,
            $path + "." + ii.toString(36)
          )
        )
      );
    } else if (a[0] == MT.MAP) {
      let rMap = new Map();
      for (let ii = 0; ii < v.length; ii += 2) {
        rMap.set(
          cast_primitive(v[ii], a[1], typeName, typeField),
          cast_or_ref(
            v[ii + 1],
            a[2],
            typeName,
            typeField,
            $dict,
            $path + "." + ii.toString(36)
          )
        );
      }
      tv = rMap;
    }
    $dict.set($path, tv);
    return tv;
  } else if ((<any>type).BYTES_PER_ELEMENT > 0) {
    //TypeArray
    if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) {
      // normal_array, TypeArray or ArrayBuffer
      return new (<any>type)(v);
    } else if (typeof Buffer != "undefined" && Buffer.isBuffer(v)) {
      //nodejs or fibjs
      return new (<any>type)(v);
    } else {
      cast_fail_type(typeName, typeField);
    }
  } else {
    return (<any>type).FromRefArray(v, $dict, $path);
  }
}
function cast_or_ref(
  v: any,
  type: MtBase | NewableAny,
  typeName: string,
  typeField: string,
  $dict: Map<string, any>,
  $path: string
) {
  if (<MtBase>type < MT.OBJ) {
    return cast_primitive(v, <MtBase>type, typeName, typeField);
  }
  return (<any>type).FromRefArray(v, $dict, $path);
}

function cast_primitive(
  v: any,
  type: MtBase,
  typeName: string,
  typeField: string
) {
  if (type == MT.LONG) {
    v = Cast_Int64(v);
  } else if (type >= MT.BYTE && type <= MT.DOUBLE) {
    v = Number(v);
    if (!Number.isFinite(v)) {
      cast_fail_type(typeName, typeField);
    }
  } else if (type == MT.BOOL) {
    v = Boolean(v);
  } else if (type == MT.DATE) {
    if (v instanceof Date == false) {
      cast_fail_type(typeName, typeField);
    }
  } else if (type == MT.STR && typeof v != "string") {
    cast_fail_type(typeName, typeField);
  }
  return v;
}
function cast_fail_type(typeName: string, typeField: string) {
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
export function MsgClass(id?: number, name?: string): ClassDecorator {
  return function (T: any) {
    let cname = name || T.name;
    MsgArray.MetaBind(
      T,
      id || Next_Id(cname),
      cname,
      T.prototype[FIELDS_PROPERTY_KEY] || []
    );
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
export function MsgField(
  typed: MetaType,
  required: MetaInfoFieldRequired = 0,
  name?: string
): PropertyDecorator {
  return function (target: any, propKey: string | symbol) {
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
export class JsonX {
  public static Stringify(val: any, space?: number | string): string {
    return JSON.stringify(val, JsonReviverEncode, space);
  }
  public static Parse(jsonStr: string): any {
    return JSON.parse(jsonStr, JsonReviverDecode);
  }
}

function JsonReviverEncode(key: string, value: any): any {
  if (typeof value == "bigint") {
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
      data: Array.from(value),
    };
  } else if (value && value.buffer instanceof ArrayBuffer) {
    return {
      type: value.constructor.name,
      data: Array.from(value),
    };
  }
  return value;
}
function JsonReviverDecode(key: any, value: any) {
  if (typeof value === "string") {
    let a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(
      value
    );
    if (a) {
      return new Date(Date.parse(value));
    }
  } else if (
    value != null &&
    typeof value == "object" &&
    typeof value.type == "string" &&
    value.data
  ) {
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
function JsonDecycle(object: any) {
  var objects = new WeakMap();
  return (function derez(value, path) {
    var old_path;
    var nu: any;
    if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Boolean) &&
      !(value instanceof Date) &&
      !(value instanceof Number) &&
      !(value instanceof RegExp) &&
      !(value instanceof String)
    ) {
      old_path = objects.get(value);
      if (old_path !== undefined) {
        return { $ref: old_path };
      }
      objects.set(value, path);
      if (value instanceof Set) {
        value = Array.from(value);
      } else if (value instanceof Map) {
        var tmp: any = {};
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
      } else {
        nu = {};
        Object.keys(value).forEach(function (name) {
          nu[name] = derez(
            value[name],
            path + "[" + JSON.stringify(name) + "]"
          );
        });
      }
      return nu;
    }
    return value;
  })(object, "$");
}

const __GLOBAL: any = typeof window == "object" ? window : global;
