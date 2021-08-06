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
import * as http from "http";
import {api_requireBy, api_requireByDir, api_requireByFileList, Facade} from "./api_facade";

export interface regist_opts{
    //API路径前缀
    prefix?: string | string[] | RegExp,
    //API全路径拼装模式还是替换前缀模式
    prefixFull?:boolean,
    //静态文件夹目录
    static?: string
}

/**
 * 通过文件夹扫描api注册
 * @param dir
 * @param fileFilter
 * @param opts
 * @param requireFileFn
 */
export function registApiByDir(dir?, fileFilter?: (f: string) => boolean, opts?: regist_opts, requireFileFn?: (id: string) => any) {
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
export function registByFileList(allApiFileList: string[], opts?: regist_opts, requireFileFn?: (id: string) => any) {
    return do_regist(() => {
        return api_requireByFileList(allApiFileList, requireFileFn);
    }, opts);
}

/**
 * 自己通过回调方法做扫描注册
 * @param diyRequireApiFileFn
 * @param opts
 */
export function registByDiy(diyRequireApiFileFn: () => void, opts?: regist_opts) {
    return do_regist(() => {
        return api_requireBy(diyRequireApiFileFn);
    }, opts);
}

function do_regist(requireFnWrap: Function, opts?: regist_opts) {
    let exportsObj: any = new mq.Routing(), routing: Class_Routing = exportsObj, last_api_routing = Facade._api_routing;
    Facade._api_routing = routing;
    if(opts.prefixFull && opts.prefix && opts.prefix["length"]>0){
        Facade._api_prefixs = Array.isArray(opts.prefix) ? <string[]>opts.prefix : [<string>opts.prefix];
    }else{
        Facade._api_prefixs = [];
    }
    let pf_reg_scan_suc = requireFnWrap();
    if (!pf_reg_scan_suc && last_api_routing != null) {
        routing = last_api_routing;
    }
    // routing.get("/favicon.ico", <any>(req=>{req.response.redirect(301,"https://fibjs.org/favicon.ico")}));
    if (opts) {
        if (opts.prefix ){
            if (util.isRegExp(opts.prefix)){
                exportsObj = (() => {
                    return new mq.Chain([req => {
                        req.address = req.address.replace(opts.prefix, "");
                        req.value = req.address;
                    }, routing]);
                })();
            }else if (opts.prefix["length"]>0) {
                let prefixArr: string[] = Array.isArray(opts.prefix) ? <string[]>opts.prefix : [<string>opts.prefix];
                if(!opts.prefixFull){
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
            }
        }
        if (pf_reg_scan_suc) {
            let endFn: any;
            let res404 = new Facade.defaultRes().stat(404, "not found");
            let res404Headers = {"Content-Type": res404.contentType()};
            let res404Data = res404.encode();
            let write404Fn = req => {
                req.response.statusCode = 404;
                req.response.statusMessage = "not found";
                req.response.setHeader(res404Headers);
                req.response.write(res404Data);
            }
            if (opts.static && opts.static.length > 0) {
                endFn = req => {
                    let fileFn = http.fileHandler(opts.static);
                    if (req.method == "GET") {
                        fileFn.invoke(req);
                        if (req.response.statusCode == 404) {
                            write404Fn(req);
                        }
                    } else {
                        write404Fn(req);
                    }
                }
            } else {
                endFn = write404Fn
            }
            routing.all("*", endFn);
        }
    }
    return exportsObj;
}