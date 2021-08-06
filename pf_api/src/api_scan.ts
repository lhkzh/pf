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
import * as fs from "fs";

export interface regist_static_file {
    //静态文件目录
    dir: string,
    //支持的静态文件后缀
    suffix?: string | string[],
    //静态文件的mime
    mimes?: any
}

export interface regist_opts {
    //API路径前缀
    prefix?: string | string[],
    //静态文件夹处理
    static?: regist_static_file | Function | string
}

/**
 * 通过文件夹扫描api注册
 * @param dir
 * @param fileFilter
 * @param opts
 * @param requireFileFn
 */
export function registApiByDir(dir?:string, fileFilter?: (f: string) => boolean, opts?: regist_opts, requireFileFn?: (id: string) => any) {
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
    let routing: Class_Routing = new mq.Routing(), last_api_routing = Facade._api_routing;
    Facade._api_routing = routing;
    let pf_reg_scan_suc = requireFnWrap();
    if (!pf_reg_scan_suc && last_api_routing != null) {
        routing = last_api_routing;
    }
    if (pf_reg_scan_suc) {
        if (opts.static) {
            if (opts.static["dir"]) {
                let staticOpt = <regist_static_file>opts.static;
                let fileFn = http.fileHandler(staticOpt.dir, staticOpt.mimes || {});
                let fileSufixArr = staticOpt.suffix && staticOpt.suffix.length ?
                    (Array.isArray(staticOpt.suffix) ? <string[]>staticOpt.suffix : (<string>staticOpt.suffix).split(',')) :
                    ["html", "htm", "css", "txt", "xml", "js", "json", "jpg", "png", "bmp", "webp", "zip", "font", "ttf", "woff"];
                routing.get(`*.(${fileSufixArr.join('|')})$`, fileFn);
            } else if (util.isString(opts.static)) {
                if (fs.exists(<string>opts.static) && fs.stat(<string>opts.static).isDirectory()) {
                    routing.get("*", http.fileHandler(<string>opts.static, {}, require("os").os.platform() == "win32"));
                }
            } else {
                routing.get("*", <any>opts.static);
            }
        }
        let res404 = new Facade.defaultRes().stat(404, "not found");
        let res404Headers = {"Content-Type": res404.contentType()};
        let res404Data = res404.encode();
        routing.all("*", <any>((req) => {
            req.response.statusCode = 404;
            req.response.statusMessage = "not found";
            req.response.setHeader(res404Headers);
            req.response.write(res404Data);
        }));
        let prefix_list: string[] = opts.prefix && opts.prefix["length"] > 0 ? (Array.isArray(opts.prefix) ? <string[]>opts.prefix : [<string>opts.prefix]) : [];
        let real_routing = new mq.Routing();
        prefix_list.forEach(prefix => {
            real_routing.all(prefix, routing);
        });
        real_routing.append(routing);
        routing = real_routing;
    }
    return routing;
}