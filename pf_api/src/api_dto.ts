/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * dto: 根据注解规则，实现参数object-转数据类定义
 * @author zhh
 */
import { ApiRunError } from ".";
import {BaseParamRule, CheckBaseParamRule} from "./api_ctx";
import {type_convert} from "./api_types";
import {Reflection} from "./reflection";

const $_VAL_TYPE_FIELDS = "$_val_type_fields";

function save_dto_fields(target: any, pk: string, rule: any) {
    if (!Reflection.hasMetadata($_VAL_TYPE_FIELDS, target)) {
        Reflection.defineMetadata($_VAL_TYPE_FIELDS, {}, target);
    }
    Reflection.getMetadata($_VAL_TYPE_FIELDS, target)[pk] = rule;
}

/**
 * 值类型的类属性注解
 * @param rule
 * @constructor
 */
export function DtoField(rule?: BaseParamRule) {
    if (arguments.length > 1 && typeof arguments[0] == "object" && typeof arguments[1] == "string") {
        arguments[0][arguments[1]] = null;
        save_dto_fields(arguments[0], arguments[1], {option: false});
    }
    return (target: any, propKey: string) => {
        save_dto_fields(target, propKey, rule || {option: false});
    }
}

/**
 * 值类型-的类判断
 * @param type
 * @constructor
 */
export function DtoIs(type: any) {
    return type && Reflection.hasMetadata($_VAL_TYPE_FIELDS, type.prototype);
}

/**
 * 值类型-类实例化，转换规则不符合则返回NULL
 * @param type
 * @param _data
 * @param _throw
 * @constructor
 */
export function DtoConvert(type: any, _data: any, _throw?: boolean) {
    let _kvs;
    if (!_data || !(_kvs = <any>Reflection.getMetadata($_VAL_TYPE_FIELDS, type.prototype))) {
        if(_throw){
            throw new ApiRunError(`dto type bad,${type.name}`, 403);
        }
        return null;
    }
    let _imp = new (<any>type)();
    for (let _k in _kvs) {
        let _t = Reflection.getMetadata("design:type", type.prototype, _k);
        let _v = _data.hasOwnProperty(_k) ? type_convert(_t, _data[_k]) : undefined;
        let _r = _kvs[_k];
        if (_r) {
            if (_v == undefined) {
                if (_r.option) {
                    _v = _r.default;
                } else {
                    if(_throw){
                        throw new ApiRunError(`dto field:${_k} 404,${type.name}`, 403);
                    }
                    return null;
                }
            } else if (!CheckBaseParamRule(_t, _v, _r)) {
                if(_throw){
                    throw new ApiRunError(`dto field:${_k} bad,${type.name}`, 403);
                }
                return null;
            }
        }
        _imp[_k] = _v;
    }
    return _imp;
}