/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
import * as vm from "vm";

/**
 * 通过
 * @param id
 * @param baseDir
 * @param globals
 * @param mods
 */
export function requireBySandBox(id:string, baseDir:string, globals:any={}, mods:any={}){
    return (new vm.SandBox(mods, globals)).require(id, baseDir);
}



//获取方法参数名 基于ES6
export const getParamterNames:(fn:any)=>Array<string> = (function () {
    const COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const DEFAULT_PARAMS = /=[^,)]+/mg;
    const FAT_ARROWS = /=>.*$/mg;
    return (fn: any): Array<string> => {
        if (typeof fn !== 'object' && typeof fn !== 'function') {
            return [];
        }
        let code = fn.prototype ? fn.prototype.constructor.toString() : fn.toString();
        code = code
            .replace(COMMENTS, '')
            .replace(FAT_ARROWS, '')
            .replace(DEFAULT_PARAMS, '');
        let result = code.slice(code.indexOf('(') + 1, code.indexOf(')')).match(/([^\s,]+)/g);
        return result === null ? [] : result;
    }
})();