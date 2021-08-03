/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * scan: 扫描目录/文件列表，注册API
 * @author zhh
 */
import * as mq from "mq";
import * as util from "util";
import {api_requireBy, api_requireByDir, api_requireByFileList, Facade} from "./api_facade";
import * as http from "http";

/**
 * 通过文件夹扫描api注册
 * @param dir
 * @param fileFilter
 * @param opts
 * @param requireFileFn
 */
export function registApiByDir(dir?, fileFilter?: (f: string) => boolean, opts?: { prefix?: string | string[], static?: string }, requireFileFn?: (id: string) => any) {
    return do_regist(() => {
        return api_requireByDir(dir, fileFilter, requireFileFn);
    }, opts);
}

/**
 * 通过具体文件列表扫描api注册
 * @param allApiFileList
 * @param opts
 * @param requireFileFn
 */
export function registByFileList(allApiFileList: string[], opts?: { prefix?: string | string[], static?: string }, requireFileFn?: (id: string) => any) {
    return do_regist(() => {
        return api_requireByFileList(allApiFileList, requireFileFn);
    }, opts);
}

/**
 * 自己通过回调方法做扫描注册
 * @param diyRequireApiFileFn
 * @param opts
 */
export function registByDiy(diyRequireApiFileFn: () => void, opts?: { prefix?: string | string[], static?: string }) {
    return do_regist(() => {
        return api_requireBy(diyRequireApiFileFn);
    }, opts);
}

function do_regist(requireFnWrap: Function, opts?: { prefix?: string | string[], static?: string }) {
    let exportsObj: any = new mq.Routing(), routing: Class_Routing = exportsObj, last_api_routing = Facade._api_routing;
    Facade._api_routing = routing;
    let pf_reg_scan_suc = requireFnWrap();
    if (!pf_reg_scan_suc && last_api_routing != null) {
        routing = last_api_routing;
    }
    // routing.get("/favicon.ico", <any>(req=>{req.response.redirect(301,"https://fibjs.org/favicon.ico")}));
    if (opts) {
        if (opts.prefix && opts.prefix.length > 0) {
            let prefixArr: string[] = util.isArray(opts.prefix) ? <string[]>opts.prefix : [<string>opts.prefix];
            exportsObj = (() => {
                let api_hdlrs: any[] = [routing];
                prefixArr.forEach(s => {
                    api_hdlrs.unshift(req => {
                        if (req.address.startsWith(s)) {
                            req.address = req.address.substr(s.length);
                            req.value = req.address;
                        }
                    });
                });
                return new mq.Chain(api_hdlrs);
            })();
        }
        if (opts.static && opts.static.length > 0 && pf_reg_scan_suc) {
            routing.get("*", http.fileHandler(opts.static));
        }
    }
    return exportsObj;
}