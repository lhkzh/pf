export type NewableAny = {
    new (...params: any[]): any;
};
export type Newable<T> = {
    new (...params: any[]): T;
};
/**
 * 类型定义
 * @public
 */
export declare enum MT {
    BOOL = 0,
    BYTE = 1,
    SHORT = 2,
    INT = 3,
    LONG = 4,
    I53 = 5,
    FLOAT = 6,
    DOUBLE = 7,
    STR = 8,
    DATE = 9,
    OBJ = 10,
    ARR = 11,
    MAP = 12,
    SET = 13
}
export type MtBase = MT.BOOL | MT.BYTE | MT.SHORT | MT.INT | MT.LONG | MT.I53 | MT.FLOAT | MT.DOUBLE | MT.STR | MT.DATE;
export type MtBox = MT.OBJ | MT.ARR | MT.MAP | MT.SET;
export type MtKey = MT.BYTE | MT.SHORT | MT.INT | MT.I53 | MT.LONG | MT.STR;
export type MetaType = MtBase | [MtBox, MtBase | NewableAny] | [MtBox, MtKey, MtBase | NewableAny] | [MtBox, MtBase | NewableAny] | [MtBox, MtKey, MtBase | NewableAny] | ArrayBufferView | NewableAny;
export type MetaInfoFieldRequired = 0 | 1;
export type MetaInfoField = [string, MetaType, MetaInfoFieldRequired] | [string, MetaType, MetaInfoFieldRequired, any];
export type MetaInfoObj = {
    id: number;
    name: string;
    fields: Array<MetaInfoField>;
    clazz: NewableAny;
};
/**
 * 消息数组基类
 * @public
 */
export declare abstract class MsgArray<T> {
    static CHECK: {
        OUT: boolean;
        IN: boolean;
    };
    toString(): string;
    toArray($deep?: number): any[];
    toRefArray(): any[];
    static CastByArray<T>(type: Newable<T>, arr: any[]): T;
    static CastByRefArray<T>(type: Newable<T>, arr: any[]): T;
    static ToArray<T>(v: T, $deep?: number): any[] | null;
    static FromArray<T>(a: any[]): T;
    static ToRefArray<T>(v: T): any[] | null;
    static FromRefArray<T>(a: any[]): T;
    static ClassByName(name: string): NewableAny | undefined;
    static ClassById(id: number): NewableAny | undefined;
    static MetaByName(name: string): MetaInfoObj | undefined;
    static MetaById(id: number): MetaInfoObj | undefined;
    static MetaByClass(T: NewableAny): MetaInfoObj | undefined;
    static MetaIdList(): number[];
    static MetaNameList(): string[];
    static set CastInt64(fn: (v: any) => any);
    static get CastInt64(): (v: any) => any;
    static set NextId(fn: (name: string) => number);
    /**
     * 注解类属性信息的方法
     */
    static Meta(info: {
        id?: number;
        name?: string;
        fields: Array<MetaInfoField>;
    }): ClassDecorator;
    /**
     * 绑定类与属性关系
     */
    static MetaBind(T: NewableAny, id: number, name: string, fields: Array<MetaInfoField>): void;
    /**
     * 设置是否开启-TypedArray转array，CSharp的版本对应需要开
     */
    static OptionTypedArray(flag: boolean): void;
}
/**
 * 注解-数据类的方法
 * @param id 类消息ID
 * @param name 类消息NAME（在某些编译情况时有用）
 * @returns
 * @public
 */
export declare function MsgClass(id?: number, name?: string): ClassDecorator;
/**
 * 注解-数据类成员属性的方法
 * @param typed 成员的数据类型
 * @param required 成员是否必须要有数据（在解析时会检测）
 * @param name 成员的NAME（如果编译时擦除变量名或者需要混淆则非常有用）
 * @returns
 * @public
 */
export declare function MsgField(typed: MetaType, required?: MetaInfoFieldRequired, name?: string): PropertyDecorator;
/**
 * @public
 */
export declare class JsonX {
    static Stringify(val: any, space?: number | string): string;
    static Parse(jsonStr: string): any;
}
//# sourceMappingURL=index.d.ts.map