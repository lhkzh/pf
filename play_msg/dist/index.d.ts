export declare class JsonX {
    static Stringify(val: any, space?: number | string): string;
    static Parse(jsonStr: string): any;
}

export declare type MetaInfoField = [string, MetaType, MetaInfoFieldRequired];

export declare type MetaInfoFieldRequired = 0 | 1;

export declare type MetaInfoObj = {
    id: number;
    name: string;
    fields: Array<MetaInfoField>;
    clazz: NewableAny;
};

export declare type MetaType = MType | [
"Arr",
MType | NewableAny
] | [
"Obj",
MType.I8 | MType.I16 | MType.I32 | MType.I53 | MType.I64 | MType.STR,
MType | NewableAny
] | [
"Set",
MType | NewableAny
] | [
"Map",
MType.I8 | MType.I16 | MType.I32 | MType.I53 | MType.I64 | MType.STR,
MType | NewableAny
] | ArrayBufferView | NewableAny;

export declare abstract class MsgArray {
    static MAX_DEEP: number;
    toArray(): any[];
    static ToArray<T extends MsgArray>(v: T): any[] | null;
    static FromArray<T extends MsgArray>(a: any[]): T;
    static CastByArray<T extends MsgArray>(type: Newable<T>, arr: any[]): T;
    static ClassByName(name: string): NewableAny | undefined;
    static ClassById(id: number): NewableAny | undefined;
    static MetaByName(name: string): MetaInfoObj | undefined;
    static MetaById(id: number): MetaInfoObj | undefined;
    static MetaByClass(T: NewableAny): MetaInfoObj | undefined;
    static MetaIdList(): number[];
    static MetaNameList(): string[];
    static set CastInt64(fn: (v: any) => any);
    static get CastInt64(): (v: any) => any;
    /**
     * 注解类属性信息的方法
     * @param info
     * @returns
     */
    static Meta(info: {
        id?: number;
        name?: string;
        fields: Array<MetaInfoField>;
    }): ClassDecorator;
    /**
     * 绑定类与属性关系
     * @param T
     * @param id
     * @param name
     * @param fields
     */
    static MetaBind(T: NewableAny, id: number, name: string, fields: Array<MetaInfoField>): void;
    /**
     * 设置是否开启-TypedArray转array
     * @param flag
     */
    static ConfigTypedArray(flag: boolean): void;
}

/**
 * 注解-数据类的方法
 * @param id 类消息ID
 * @param name 类消息NAME（在某些编译情况时有用）
 * @returns
 */
export declare function MsgClass(id?: number, name?: string): ClassDecorator;

/**
 * 注解-数据类成员属性的方法
 * @param typed 成员的数据类型
 * @param required 成员是否必须要有数据（在解析时会检测）
 * @param name 成员的NAME（在某些编译情况时有用）
 * @returns
 */
export declare function MsgField(typed: MetaType, required?: MetaInfoFieldRequired, name?: string): PropertyDecorator;

export declare enum MType {
    BOOL = 0,
    I8 = 1,
    I16 = 2,
    I32 = 3,
    I64 = 4,
    I53 = 5,
    F32 = 6,
    F64 = 7,
    STR = 8,
    DATE = 9
}

export declare type Newable<T> = {
    new (...params: any[]): T;
};

export declare type NewableAny = {
    new (...params: any[]): any;
};

export { }
