/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * api路由注册中心
 * @author zhh
 */
import * as util from "util";
import * as coroutine from "coroutine";
import * as ws from "ws";
import * as path from "path";
import * as fs from "fs";
import * as timers from "timers";
import {Reflection as Reflect} from '@abraham/reflection';
import {linkFnComment, getCalledFile} from "./docs_comment_helper";
import {DocNode} from "./docs_helper";
import {type_convert, UploadFileInfo, IntNumber} from "./api_types";
import {
    ApiRunError,
    AbsRes,
    JsonRes,
    ApiHttpCtx,
    WsApiHttpCtx,
    AbsHttpCtx,
    ApiFilterHandler,
    ApiParamRule,
    ApiRouting,
    ApiClass,
    ApiMethod,
    CheckBaseParamRule
} from "./api_ctx";
import * as http from "http";
import {DtoInstanceMake, DtoTypeCheck} from "./api_dto";
import {getParamterNames} from "./utils";
import * as process from "process";

let current_apis: { [index: string]: Function } = {};
let current_docs: any = {};
let old_apis: { [index: string]: Function } = {};
let old_docs: any = {};
let current_routing: Class_Routing;
let old_routing: Class_Routing;
let current_codeMap: Map<number, string>;
let old_codeMap: Map<number, string>;

/**
 * api类和方法注册中心
 */
export class Facade {
    //默认输出渲染类
    public static defaultRes: new () => AbsRes = JsonRes;
    //全局检测-用于（referer host等验证，全局权限校验）
    public static globalFilter: ApiFilterHandler = (ctx: ApiHttpCtx) => true;
    //默认api授权验证-用于（权限校验）
    public static defaultFilter: ApiFilterHandler = (ctx: ApiHttpCtx) => true;
    //函数执行超时时间限制（MS）
    public static runTimeOut: number = -1;
    //是否启用模糊路径大小写(支持类似api路径节点首字母大小写和全路径大小写 方式)
    public static ignorePathCase: boolean = true;
    //是否忽略api的文档（默认false）
    public static ignoreApiDoc: boolean;
    //错误侦听函数
    public static _hookErr: (ctx: AbsHttpCtx, err: Error) => void;
    //耗时统计函数
    public static _hookTj: (apiPath: string, costMsTime: number) => void;

    //api路径
    public static get _docs(): { [index: string]: DocNode } {
        return old_docs;
    }

    //api注册中心
    public static get _apis(): any {
        return old_apis;
    }

    //api路由
    public static get _api_routing(): Class_Routing {
        return old_routing;
    }

    //api路由
    public static set _api_routing(p: Class_Routing) {
        current_routing = p;//SCAN_API_ROUTING
        if (old_routing == null) {
            old_routing = p;
        }
    }

    //是否可以通过websocket数据代理请求
    public static run_by_ws_check(args: any): boolean {
        //[request_id,pathArg,params_obj,header_obj]
        if (!Array.isArray(args) || args.length < 4 || !Number.isFinite(args[0]) || !(util.isString(args[1]) || Number.isInteger(args[1])) ||
            (args[2] != undefined && !util.isObject(args[2])) || (args[3] != undefined && !util.isObject(args[3]))
        ) {
            return false;
        }
        return true;
    }

    //通过websocket数据执行请求
    public static run_by_ws(conn: Class_WebSocket, args: any, opt?: number, overrideResWriter?: any, processCtx?: (ctx: any) => any) {
        //@see Facade.run_by_ws_check
        let api_path = Number.isFinite(args[1]) && old_codeMap.has(args[1]) ? old_codeMap.get(args[1]) : args[1];
        let fn = old_apis[api_path];
        if (fn) {
            fn(conn, args, opt, overrideResWriter, processCtx);
        } else {
            // WsApiHttpCtx.send404(conn, path, args[0]);
            let ctx = new WsApiHttpCtx(conn, args);
            ctx = processCtx ? processCtx(ctx) : ctx;
            ctx.sendJson({code: 404, msg: path})
        }
    }

    //是否可以匹配到path的api
    public static hasApiPath(path: string): boolean {
        return old_apis.hasOwnProperty(path);
    }

    //是否可以匹配到code的api
    public static hasApiCode(code: number): boolean {
        return old_codeMap.hasOwnProperty(code);
    }
}

//通过自定义注入方法扫描api文件，注入路由
export function api_requireBy(requireFn: () => void): boolean {
    return api_requireByFileList([""], requireFn)
}

//扫描dir文件夹下面所有的api文件，注入路由
export function api_requireByDir(dir?: string | string[], fileFilter?: (f: string) => boolean, requireFn?: (id: string) => any): boolean {
    if (!dir || dir.length < 1) {
        let cwd = process.cwd();
        dir = [cwd + "/out/", cwd + "/lib/", cwd + "/dist/"];
    } else {
        dir = Array.isArray(dir) ? <string[]>dir : [<string>dir];
    }
    let filelist = util.unique(dir).reduce((fileArr, dirNode) => {
        deepScanFile(dirNode, f => {
            if (f.endsWith(".js") && (fileFilter == null || fileFilter(f))) {
                fileArr.push(f);
            }
        })
        return fileArr;
    }, <Array<string>>[]);
    return api_requireByFileList(filelist, requireFn);
}

//引用所有的api文件，注入路由
export function api_requireByFileList(allApiFileList: string[], requireFn?: (id: string) => any) {
    let od = old_docs, oa = old_apis, last, rfn = requireFn || global["$vm_require$"] || require;
    current_docs = {};
    current_apis = {};
    current_codeMap = new Map<number, string>();
    try {
        allApiFileList.forEach(f => {
            last = f;
            rfn(f);
        });
        old_docs = current_docs;
        old_apis = current_apis;
        old_codeMap = current_codeMap;
        if (current_routing != old_routing) {
            old_routing = current_routing;
        }
        return true;
    } catch (e) {
        current_docs = od;
        current_apis = oa;
        current_codeMap = old_codeMap;
        console.error("Facade|scan", last, e);
        return false;
    }
}

const VAR_API_CTX = "$_api_ctx";

//获取当前api请求的关联类
export function current_api_ctx(This?: any): ApiHttpCtx {
    // if (This && This[VAR_API_CTX]) {
    //     return This[VAR_API_CTX];
    // }
    let fiber = coroutine.current();
    if (fiber[VAR_API_CTX]) {
        return fiber[VAR_API_CTX];
    }
    return null;
}

//当前请求的api路径
export function current_api_path(def: string = "unknow"): string {
    let ctx = current_api_ctx(null)
    return ctx ? ctx.getPath() : def;
}

function format_rule_src(info: ApiParamRule) {
    if (!info.src) {
        info.src = "any";//request
    }
    info.src = info.src.toLowerCase();
    if (info.src == "*" || info.src.toLowerCase() == "request") {
        info.src = "any";//request
    } else if (info.src == "query") {
        info.src = "get";
    } else if (info.src == "body") {
        info.src = "post";
    } else if (info.src != "path" && info.src != "socket" && info.src != "header" && info.src != "get" && info.src != "any") {
        info.src = "post";
    }
    return info;
}

/**
 * 参数规则函数
 * @param info 参数规则配置
 * @constructor
 */
export function RULE(info: ApiParamRule): ParameterDecorator {
    if (info) {
        //target=类property，key=方法名，idx=第几个参数
        return function (target: any, key: string, idx: number) {
            let argName = getParamterNames(target[key])[idx];//获取方法的参数名信息
            if (!info.name) {//如果规则中未定义 参数来源中的属性名，则用参数名设置上去
                info.name = argName;
            }
            info["var"] = argName;
            target[key]["param$" + idx] = format_rule_src(info);
        };
    }
    return function () {
    }
}

/**
 * request ip of socket
 * @constructor
 */
export function Ip() {
    return RULE({src: "socket", name: "remoteAddress", option: false});
}

/**
 * field from path
 * @param info
 * @constructor
 */
export function Path(info: ApiParamRule = {}) {
    return RULE({...info, src: "path"});
}

/**
 * field of header
 * @param info
 * @constructor
 */
export function Header(info: ApiParamRule = {}) {
    return RULE({...info, src: "header"});
}

/**
 * field of query
 * @param info
 * @constructor
 */
export function Query(info: ApiParamRule = {}) {
    return RULE({...info, src: "get"});
}

/**
 * field of body
 * @param info
 * @constructor
 */
export function Body(info: ApiParamRule = {}) {
    return RULE({...info, src: "post"});
}

/**
 * field of query or body
 * @param info
 * @constructor
 */
export function Param(info: ApiParamRule = {}) {
    return RULE({...info, src: "any"});
}

export function CtxBody() {
    return RULE({src: "$body"});
}

export function CtxHeaders() {
    return RULE({src: "$headers"});
}

export function CtxApi() {
    return RULE({src: "$ctx"});
}

/**
 * 接口路由：同时支持 get/post
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function ANY(path?: string | ApiMethod, code: number = 0) {
    return route2("ANY", [...arguments]);
}

/**
 * 接口路由：仅支持get
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function GET(path?: string | ApiMethod, code: number = 0) {
    return route2("GET", [...arguments]);
}

/**
 * 接口路由：仅支持post
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function POST(path?: string | ApiMethod, code: number = 0) {
    return route2("POST", [...arguments]);
}

/**
 * 接口路由：仅支持put
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function PUT(path?: string | ApiMethod, code: number = 0) {
    return route2("PUT", [...arguments]);
}

/**
 * 接口路由：仅支持patch
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function PATCH(path?: string | ApiMethod, code: number = 0) {
    return route2("PATCH", [...arguments]);
}

/**
 * 接口路由：仅支持head
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function HEAD(path?: string | ApiMethod, code: number = 0) {
    return route2("HEAD", [...arguments]);
}

/**
 * 接口路由：仅支持delete
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function DELETE(path?: string | ApiMethod, code: number = 0) {
    return route2("DELETE", [...arguments]);
}

/**
 * 转发路由：仅支持get_post
 * @param path 路由的字符串路径和权限以及输出配置
 * @param code 路由的数值代码配置
 * @constructor
 */
export function REPEATER(apiRule: ApiMethod & { toUrl: string | string[], fixPath?: (ctx: AbsHttpCtx) => string }, code: number = 0): MethodDecorator {
    let fixPath = apiRule.fixPath ? apiRule.fixPath : (ctx) => ctx.getPath();
    let toUrlArr = Array.isArray(apiRule.toUrl) ? <string[]>apiRule.toUrl : [apiRule.toUrl.toString()];
    let repeater = new http.Repeater(toUrlArr);
    let toIdx: number = 0;
    return function (target: any, key: string, desc: PropertyDescriptor) {
        let lastFn = desc.value;
        desc.value = function () {
            let ctx = current_api_ctx();
            let toPath = fixPath(ctx);
            if (ctx.isReal()) {
                ctx.writer = null;
                ctx.req.address = toPath;
                ctx.res.statusCode = 0;
                try {
                    repeater.invoke(ctx.req);
                } finally {
                    lastFn.apply(this, [toPath, ctx.res.statusCode == 200]);
                }
            } else {
                let toUrl = toUrlArr[(toIdx++) % toUrlArr.length] + toPath;
                let rsp: Class_HttpResponse;
                try {
                    if (ctx.isHadBody()) {
                        rsp = http.post(toUrl, {query: ctx.getBody(), json: ctx.getBody()});
                    } else {
                        rsp = http.get(toUrl);
                    }
                } catch (e) {
                    rsp = null;
                }
                if (rsp) {
                    ctx.writer.stat(rsp.statusCode, rsp.statusMessage);
                    ctx.writer.data = rsp.data;
                    ctx.writeHeader(rsp.headers);
                } else {
                    ctx.writer.stat(500, "ioerr");
                }
                ctx.writer.out(ctx);
                lastFn.apply(this, [toPath, rsp != null]);
            }
        }
        let path = apiRule.path || key;
        if (path.includes("*") == false) {
            path = path + '*';
        }
        apiRule.path = path;
        return route("ANY", apiRule, target, key, desc, code);
    }
}


/**
 * 注解方法，标记类为api类。 会扫描类属性，提取类内部所有路由方法，添加到API路径上
 * @param info API的路由合过滤器配置
 * @constructor
 */
export function API(info?: string | ApiClass): ClassDecorator {
    let map: ApiClass = <ApiClass>info;
    if (util.isString(info)) {
        map = {path: info + ""};
    } else if (info == null) {
        map = {}
    } else if (util.isFunction(info) && info["prototype"] && info["prototype"]["$subs"]) {
        regist(<any>info, null, Facade.defaultRes, Facade.defaultFilter);
        return;
    }
    return function (t) {
        if (t["prototype"] && t["prototype"]["$subs"]) {
            regist(t, map.path, map.res || Facade.defaultRes, map.filter || Facade.defaultFilter, map.baseRules);
        }
    }
}

/**
 * 标记为-websocket服务侦听器。必须要实现 (onMessage || onBuffer || onText)，可选实现（ onopen, onclose, onerror）
 * @param path websocket的路由配置
 * @param opt websocket的可选项（是否压缩，最大消息长度等）
 * @param filter websocket的路径自定义权限过滤器
 * @constructor
 */
export function WEBSOCKET(path: string = "websocket", opts: { [index: string]: any } = {
    perMessageDeflate: false,
    maxPayload: 0x1FFFF
}, filter?: ApiFilterHandler): ClassDecorator {
    return function (type) {
        let p = type && type.prototype ? type.prototype : null;
        if (p && (p.onMessage || p.onBuffer || p.onText)) {
            p["$subs"] = {length: -1};
            p["$opts"] = opts;
            regist(type, path, Facade.defaultRes, filter);
        }
    }
}

/**
 * web请求执行代理
 * @param constructor API类构造函数
 * @param res 输出数据格式化工具类
 * @param key 此API路由对应的类的方法名
 * @param filter 此API路由最终的权限检测方法
 * @param apiPath 此API路由的路由路径
 */
function api_run_wrap(constructor, res: any, key: string, filter: ApiFilterHandler, apiPath: string): any {
    let fn = function (request: any/** Class_HttpRequest */, pathArg: string/** 路由匹配后提取的路径座位参数部分 */, markFlag?: number/**模拟请求类型标记-websocket模拟分类用*/, overrideResWriter?: any/**覆盖Res*/, processCtx?: (ctx: AbsHttpCtx) => AbsHttpCtx) {
        let start_ms = Facade._hookTj != null ? Date.now() : 0;//API耗时统计-起始值
        let fiber = coroutine.current(), ctx: AbsHttpCtx;
        try {
            if (request.response) {
                ctx = new ApiHttpCtx(request, pathArg, new res());
            } else {
                ctx = new WsApiHttpCtx(request, pathArg);
                if (markFlag != 8) {//非系统内对websocket绑定的调用，需要发送数据给客户端（客户端主动请求、服务端定时主动调用模拟请求后发回）
                    ctx.writer = new (overrideResWriter || res)();
                    if (markFlag == 9) {//websocket服务端发送到客户端的通知类型（例如 服务端定时主动调用模拟请求后发回，添加path让客户端区分通知消息具体是哪个）
                        ctx.writer.path = ctx.getPath();//工作机理@see （JsonRes.out MsgpackRes.out）对writer进行序列化了
                    }
                }
                if (processCtx) {
                    ctx = processCtx(ctx);
                }
            }
            fiber[VAR_API_CTX] = ctx;
            let imp: any;
            try {
                if (filter(ctx)) {
                    imp = new constructor(ctx);
                    // imp[VAR_API_CTX] = ctx;
                    if (util.isFunction(imp["$_before"])) {//执行前准备
                        imp["$_before"](ctx, apiPath, key);
                    }
                    let ret = imp[key](ctx);
                    if (ctx.writer) {
                        ctx.writer.data = ret;
                        ctx.writer.out(ctx);
                    }
                } else if (ctx.writer) {
                    ctx.writer.stat(403, "reject").out(ctx);
                }
            } catch (e) {//出现错误
                if (ctx.writer) {
                    if (e instanceof ApiRunError) {//明确的业务错误，告知错误信息
                        ctx.writer.stat(e.code, e.message).out(ctx);
                    } else {//不明确的错误，只告知错误不告知详情，避免系统敏感信息泄露
                        ctx.writer.stat(500, "server busy").out(ctx);
                        (!Facade._hookErr) && console.error("Facade|api_run_wrap|%s", ctx.getPath(), JSON.stringify(ctx.debugMark), e);
                    }
                }
                Facade._hookErr && call_error_hook(ctx, e);
            } finally {
                try {
                    if (imp && util.isFunction(imp["$_after"])) {//执行后收尾
                        imp["$_after"](ctx, apiPath, key);
                    }
                } catch (e2) {
                    Facade._hookErr ? Facade._hookErr(ctx, e2) : console.error("Facade|api_run_wrap|%s", ctx.getPath(), JSON.stringify(ctx.debugMark), e2);
                }
            }
        } finally {
            try {
                ctx.runAfters();
            } catch (e3) {
                Facade._hookErr ? call_error_hook(ctx, e3) : console.error("Facade|api_run_afters|%s", ctx.getPath(), JSON.stringify(ctx.debugMark), e3);
            }
            if (start_ms) {//API耗时统计
                Facade._hookTj(apiPath, Date.now() - start_ms);
            }
        }
    }
    if (Facade.runTimeOut > 0) {
        let timeout = Facade.runTimeOut;
        return function () {
            try {
                timers.call(fn, timeout, ...arguments);
            } catch (e) {
                console.error("Facade|api_run_wrap_timeout", apiPath, timeout);
            }
        }
    } else {
        return fn;
    }
}

function call_error_hook(ctx: AbsHttpCtx, err: Error) {
    try {
        Facade._hookErr(ctx, err);
    } catch (ehook) {
        console.error("Facade|api_run_wrap|%s", ctx.getPath(), ehook);
    }
}

/**
 * websocket执行代理函数，根据http_req请求和websocket类的实现方式，进行过滤校验成功后升级websocket。然后根据情况调用websocket定义的api的open/text/buffer/data/close
 * @param constructor 构造函数
 * @param opts 配置项
 * @param filter 过滤器
 */
function websocket_run_wrap(constructor, opts, filter: ApiFilterHandler): any {
    return function (req: Class_HttpRequest, regPartPath: string = "") {
        let imp = new constructor();
        let suc = true;
        if (imp.onCheck) {
            suc = imp.onCheck(req, regPartPath);
        } else if (filter) {
            suc = filter(new ApiHttpCtx(req, regPartPath));
        }
        if (suc) {
            try {
                ws.upgrade(opts, conn => {
                    try {
                        if (imp.onOpen) {
                            imp.onOpen(conn, req, regPartPath);
                        }
                        if (imp.onText || imp.onBuffer) {
                            conn.onmessage = function (m) {
                                imp.onMessage && imp.onMessage(m.data, conn);
                                if (m.type == 1) {
                                    imp.onText && imp.onText(m.data, conn);
                                } else {
                                    imp.onBuffer && imp.onBuffer(m.data, conn);
                                }
                            }
                        } else if (imp.onMessage) {
                            conn.onmessage = function (m) {
                                imp.onMessage(m.data, conn);
                            }
                        }
                        if (imp.onClose) {
                            conn.onclose = function () {
                                imp.onClose(conn);
                            }
                        }
                        if (imp.onError) {
                            conn.onerror = function (e) {
                                imp.onError(e, conn);
                            }
                        }
                    } catch (e) {
                        conn.close();
                        console.error("Facade|Websocket|on_openInit", e);
                    }
                }).invoke(req);
            } catch (e) {
                suc = false;
            }
        }
        if (!suc) {
            req.response.writeHead(403, {Connection: "close"});
            req.response.write(<any>"reject");
            req.end();
            req.socket["timeout"] = 1;
        }
    }
}

const normal_path_reg = /^[a-zA-Z0-9\/\-\_\.]+$/;

function path_first_lower(p: string) {
    return p.split('/').map(e => e.substr(0, 1).toLowerCase() + e.substr(1)).join('/');
}

function path_first_upper(p: string) {
    return p.split('/').map(e => e.substr(0, 1).toUpperCase() + e.substr(1)).join('/');
}

/**
 * 注册API类，添加所有类内部路由函数和函数文档。
 * @param constructor 类构造函数
 * @param path 类级路由前缀
 * @param res 类级配置的输出工具类, 基础定义writer=AbsRes的子类（TextRes JsonRes等）
 * @param filter 类权限过滤器
 */
function regist(constructor: any, path: string, res: any, filter: ApiFilterHandler, baseRules?: Array<ApiParamRule>) {
    let subs: Array<ApiRouting> = constructor.prototype["$subs"];//提取类属方法的路由定义
    if (!subs || !subs.hasOwnProperty("length")) {//没有注册过子路由函数，跳出。这里不判断array类型，是因为websocket伪造了个假array
        return;
    }
    delete constructor.prototype["$subs"];//释放内存
    if (baseRules) {
        baseRules.forEach(br => {
            if (!br.name) {
                return;
            }
            if (!br.type) {
                br.type = String;
            }
            br = format_rule_src(br);
            subs.forEach(ar => {
                if (ar.rules.some(ir => {
                    return ir.name == br.name && ir.src == br.src;
                }) == false) {
                    ar.rules.push(br);
                }
            });
        });
    }
    let fnComments = Facade.ignoreApiDoc ? {} : linkFnComment(getCalledFile(__dirname));//获取调用到注册的类的文件,提取文件中的文档注释
    path = path != null ? path : "/" + constructor.name.toLowerCase();//类方法名
    if (path != "" && path.charAt(0) != '/') {
        path = "/" + path;
    }
    let routing: Class_Routing = current_routing, apis: { [index: string]: Function } = current_apis,
        codeMap = current_codeMap;
    let doc_list: { method: string, name: string, path: string, code: number, rules: ApiParamRule[], cms: any }[] = [];
    let tmpMaps = {};
    for (let i = 0; i < subs.length; i++) {
        let node = subs[i];
        let key = node.key;
        let relativePath = path == '/' && node.path.charAt(0) == '/' ? node.path : path + node.path;
        node.path = relativePath;
        let fn = api_run_wrap(constructor, node.res || res, key, node.filter || filter, relativePath);
        let ignore_path_case = Facade.ignorePathCase && normal_path_reg.test(relativePath);
        apis[relativePath] = fn;
        if (ignore_path_case) {
            apis[path_first_lower(relativePath)] = fn;
            apis[path_first_upper(relativePath)] = fn;
            apis[relativePath.toLowerCase()] = fn;
        }
        doc_list.push({
            method: node.method,
            name: node.key,
            path: relativePath,
            code: node.code,
            rules: node.rules,
            cms: fnComments[node.key]
        });
        current_docs[constructor.name] = {name: constructor.name, cms: fnComments[constructor.name], list: doc_list};
        if (routing) {
            let fnArr = [];
            if (node.method == "ANY") {
                fnArr.push("post", "get");
            } else if (node.method == "GET") {
                fnArr.push("get");
            } else if (node.method == "POST") {
                fnArr.push("post");
            } else if (node.method == "put") {
                fnArr.push("put");
            } else if (node.method == "DELETE") {
                fnArr.push("del");
            }
            fnArr.forEach(fnName => {
                if (!tmpMaps.hasOwnProperty(fnName)) {
                    tmpMaps[fnName] = {};
                }
                if (node.code && codeMap.has(node.code) == false) {
                    tmpMaps[fnName]['/' + node.code] = fn;
                    codeMap.set(node.code, relativePath);
                }
                tmpMaps[fnName][relativePath] = fn;
                if (ignore_path_case) {
                    tmpMaps[fnName][relativePath.toLowerCase()] = fn;
                    tmpMaps[fnName][path_first_lower(relativePath)] = fn;
                    tmpMaps[fnName][path_first_upper(relativePath)] = fn;
                }
            });
        }
    }
    if (subs.length < 0 && path) {//websocket
        doc_list.push({method: "get", name: constructor.name, path: path, code: 0, rules: [], cms: fnComments[path]});
        current_docs[constructor.name] = {name: constructor.name, cms: fnComments[constructor.name], list: doc_list};

        let fn = websocket_run_wrap(constructor, constructor.prototype["$opts"], filter);
        apis[path] = fn;

        if (!tmpMaps["get"]) {
            tmpMaps["get"] = {};
        }
        tmpMaps["get"][path] = tmpMaps["get"][path.toLowerCase()] = tmpMaps["get"][path_first_upper(path)] = fn;
    }
    if (routing) {
        for (let fnName in tmpMaps) {
            routing[fnName](tmpMaps[fnName]);
        }
    }
}

/**
 * 装饰-api具体方法，替换掉api类的路由方法，执行原始方法前先进行参数提取、参数校验，然后在传参到原始方法执行
 * @param requestMethod API请求的HTTP方法
 * @param srcFn 原始定义的方法
 * @param paramRules 各参数定义的规则
 */
function decorator_route_proxy(requestMethod: string, srcFn: Function, paramRules: Array<ApiParamRule>) {//代理方法
    return function (ctx: AbsHttpCtx) {
        /*if(!util.isObject(ctx) || (!(ctx instanceof ApiHttpCtx) && !(ctx instanceof WsApiHttpCtx))){
            return srcFn.apply(this,...arguments);
        }*/
        // //let ctx:ApiHttpCtx=this[VAR_API_CTX];//coroutine.current()["$api_ctx"];
        // if(!(ctx instanceof ApiHttpCtx) && !(ctx instanceof WsApiHttpCtx)){
        //     return srcFn.apply(this,Facade,arguments);
        // }
        // let ctxMethod=ctx.getMethod();
        // if(requestMethod!=ctxMethod && (requestMethod!="ANY" || (ctxMethod!="GET" || !ctx.isHadBody()))){
        //     //请求方法不对
        //     throw new ApiRunError("bad_method", 405);
        // }
        let args = [], failAt = -1;
        M:for (let i = 0; i < paramRules.length; i++) {
            let rule = paramRules[i], type = rule.type;
            let source: any = null;
            if (rule.src == "get") {
                source = ctx.getQuery();
            } else if (rule.src.charAt(0) == "p") {//rule.src=="post"||rule.src=="put" ||rule.src=="patch" path?
                if (rule.src == "path") {
                    if (ctx.pathArg) {
                        source = {};
                        source[rule.name] = ctx.pathArg;
                    }
                } else {
                    source = ctx.getBody();
                }
            } else if (rule.src == "any") {
                if (ctx.hasPart(rule.name)) {
                    source = ctx.getBody();
                } else if (ctx.hasQuery(rule.name)) {
                    source = ctx.getQuery();
                } else if (ctx.getHeaders()[rule.name]) {
                    source = ctx.getHeaders();
                }
            } else if (rule.src == "header") {
                source = ctx.getHeaders();
            } else if (rule.src == "socket") {
                source = ctx.getSocket();
            } else if (rule.src.charAt(0) == "$") {
                if (rule.src == "$ctx") {
                    args[i] = ctx;
                } else if (rule.src == "$headers") {
                    args[i] = ctx.getHeaders();
                } else if (rule.src == "$body") {
                    if (!ctx.isHadBody()) {
                        failAt = i;
                        break;
                    }
                    if (DtoTypeCheck(rule.type)) {
                        let _imp = DtoInstanceMake(rule.type, ctx.getBody());
                        if (!_imp) {
                            failAt = i;
                            break M;
                        }
                        args[i] = _imp;
                    } else {
                        args[i] = ctx.getBody();
                    }
                }
                continue;
            }

            if (!args.hasOwnProperty(i) && (source == null || (!source.hasOwnProperty(rule.name) && !source.hasOwnProperty(rule.name + '[]')) && source[rule.name] === undefined)) {
                if (!rule.option) {
                    failAt = i;
                    break;//找不到这个必选参数的值
                }
            } else {
                args[i] = source.hasOwnProperty(rule.name) ? source[rule.name] : (source[rule.name + '[]'] || source[rule.name]);
            }
            if (args.hasOwnProperty(i)) {
                let srcArg = args[i];
                // args[i]=type(srcArg);
                if (rule.check_convert != null) {
                    let cvArg = rule.check_convert(srcArg);
                    if (cvArg === null || cvArg === undefined) {
                        failAt = i;
                        break;
                    } else {
                        args[i] = cvArg;
                    }
                } else if (rule.type == Array && !Array.isArray(srcArg)) {
                    if (util.isString(srcArg)) {
                        args[i] = srcArg.split(',');
                    } else if (util.isObject(srcArg)) {//JSON.stringify TypeArray默认会变object
                        args[i] = Object.values(srcArg);
                    } else {
                        failAt = i;
                        break;
                    }
                } else {
                    args[i] = type_convert(type, srcArg);
                }
                if (args[i] === null && !rule.option) {
                    failAt = i;
                    break M;
                }
                if (type == UploadFileInfo) {
                    if (args[i] === null) {
                        failAt = i;
                        break;
                    }
                    let size = args[i].body.size();
                    if (
                        (rule.min != undefined && size < rule.min) || (rule.max != undefined && size > rule.max)
                    ) {
                        failAt = i;
                        break;// 参数非法
                    }
                } else if (type == IntNumber) {
                    if (isNaN(args[i]) ||
                        (rule.min != undefined && args[i] < rule.min) || (rule.max != undefined && args[i] > rule.max) ||
                        (rule.in && !rule.in.includes(args[i]))
                    ) {
                        failAt = i;
                        break;// 参数非法
                    }
                } else if (!CheckBaseParamRule(type, args[i], rule)) {
                    failAt = i;
                    break;// 参数非法
                }
            } else {
                args[i] = rule.default;
            }
        }
        if (failAt > -1) {
            // 缺少参数 or 参数类型错误
            throw new ApiRunError("bad_arg:" + paramRules[failAt].name, 403);
        } else {
            return srcFn.apply(this, args);
        }
    }
}

/**
 * 装饰-api类函数的具体方法。根据配置，替换掉原函数。
 * @param method HttpReset方法
 * @param pathInfo 路由相关配置
 * @param target 类property
 * @param key 方法的源字段
 * @param desc 属性描述符，可替换其包裹的方法
 * @param pathCode 路由的数字表示数
 */
function route(method: string, pathInfo: string | ApiClass, target: any, key: string, desc: PropertyDescriptor, pathCode: number) {
    // console.log(p,typeof target[key])
    let pathOpt: ApiClass = !util.isString(pathInfo) ? pathInfo as ApiClass : null;
    let path: string = pathInfo == null ? null : (pathOpt ? pathOpt.path : pathInfo.toString());
    let p: string = (path != null ? path : key);
    if (p != "" && p.charAt(0) != '/') {
        p = '/' + p;
    }
    let srcFn: Function = desc.value;
    let paramTypes: Array<Function> = Reflect.getMetadata("design:paramtypes", target, key);//参数类型
    let paramNames: Array<string> = getParamterNames(srcFn);//方法的各参数名
    let paramRules: Array<ApiParamRule> = [];//方法的各参数规则
    let args_names: { [index: string]: ApiParamRule } = {};
    for (let i = 0; i < paramNames.length; i++) {
        let tmpRule = srcFn["param$" + i];
        if (path && path.includes(':')) {
            if (tmpRule == null && path.includes(paramNames[i].toLowerCase())) {
                tmpRule = {src: "path", name: paramNames[i]};
            } else if (tmpRule != null && tmpRule.src == "path") {
                tmpRule = {src: "path", name: paramNames[i]};
            }
        }
        if (!tmpRule || !util.isObject(tmpRule)) {
            tmpRule = {name: paramNames[i], src: "any"};
            if (DtoTypeCheck(paramTypes[i])) {
                tmpRule.src = "$body";
            }
        } else if (tmpRule.src == "request") {
            tmpRule.src = "any";
        }
        if (paramTypes[i] == UploadFileInfo) {
            tmpRule.src = "post";
        }
        if (method == "GET" && ["post", "any"].includes(tmpRule.src)) {
            if (tmpRule.src != "any") {
                console.warn("Facade|route param.src!=routing.method => %s %s %s", p, tmpRule.name, tmpRule.src);
            }
            tmpRule.src = "get";
        }
        if (!tmpRule.type) tmpRule.type = paramTypes[i];
        paramRules.push(tmpRule);
        args_names[tmpRule.name] = tmpRule;
    }
    desc.value = decorator_route_proxy(method, srcFn, paramRules);
    let routingInfo: ApiRouting = {method: method, path: p, key: key, rules: paramRules, code: pathCode};
    if (pathOpt) {
        if (pathOpt.filter) routingInfo.filter = pathOpt.filter;
        if (pathOpt.res) routingInfo.res = pathOpt.res;
    }
    if (!target["$subs"]) {
        target["$subs"] = [routingInfo];
    } else {
        target["$subs"].push(routingInfo);
    }
}

/**
 * 装饰-api具体方法，装饰函数。兼容使用场景
 * 使用方法 @GET/@GET()/@GET('/api_name')/@GET('/api_name',0x01)/@GET({path:"/api_name",filter:ctx=>true})/@GET({path:"/api_name",filter:ctx=>true},0x01)
 */
function route2(method: string, args: Array<any>): MethodDecorator {
    // @GET
    if (args.length == 3) {
        return <any>route(method, null, args[0], args[1], args[2], 0);
    }
    //@GET(...)
    return function (target: any, key: string, desc: PropertyDescriptor) {
        // let pathReg=/^[A-Za-z0-9_\-\$\:\@/\*]*$/;
        // let path=args[0]&&pathReg.test(args[0])?args[0]:null;
        // let doc=args[1]?args[1]:(path==null?args[0]:null);  // @GET("xx", "return some")
        return route(method, args[0], target, key, desc, Number.isFinite(args[1]) ? args[1] : 0);
    }
}


/**
 * 遍历文件夹下面的文件
 * @param rootDir 基文件夹
 * @param fn 处理文件的方法名
 */
function deepScanFile(rootDir: string, fn: (filePath: string) => void) {
    if (fs.exists(rootDir)) {
        let rootStat = fs.stat(rootDir);
        if (rootStat.isDirectory()) {
            const rootPath = path.join(rootDir, "/");
            let fstat = fs.stat(rootPath);
            if (fstat.isDirectory()) {
                fs.readdir(rootPath).forEach(name => {
                    deepScanFile(path.join(rootPath, "/", name), fn);
                });
            }
        } else if (rootStat.isFile()) {
            fn(rootDir);
        }
    }
}

/**
 * 调用注册的函数
 * @param reqInfo
 * @param callBack
 */
export function tmp_call_api(reqInfo: { path: string, params?: any, headers?: any, ip?: string, pathArg?: string }, callBack: (contentType: string, headers: { [index: string]: string }, data: any) => {}) {
    let req_path = reqInfo.path;
    let req_ip = reqInfo.ip || "127.0.0.1";
    let req_param = reqInfo.params || {};
    let req_headers = reqInfo.headers || {};
    let req_path_arg = reqInfo["pathArg"] || null;
//[request_id, api_path,params_obj,header_obj]

    Facade.run_by_ws(<any>{
        remoteAddress: req_ip,
        readyState: 1
    }, [0, req_path, req_param, req_headers, req_path_arg], 0, null, (ctx) => {
        ctx.sendStr = (function (s, contentType) {
            callBack(contentType, this["out_headers"], s);
        }).bind(ctx);
        ctx.sendBuf = (function (s, contentType) {
            callBack(contentType, this["out_headers"], s);
        }).bind(ctx);
        ctx.writeHeader = (function (hs) {
            this["out_headers"] = hs;
        }).bind(ctx);
        return ctx;
    });
}