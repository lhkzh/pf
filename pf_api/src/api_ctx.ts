/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * 基础定义
 * api返回数据输出writer
 * api请求上下文关联
 * @author zhh
 */
import * as util from "util";
import * as msgpack from "msgpack";
import {type_convert, UploadFileInfo} from "./api_types";
import {Facade} from "./api_facade";


const ContentType_html = "text/html; charset=utf8";
const ContentType_xml = "text/xml; charset=utf8";
const ContentType_json = "application/json; charset=utf8";
const ContentType_msgpack = "application/msgpack; charset=utf8";

//基础定义writer
export class AbsRes {
    //主要相应码（如果错误则为不为0和200)
    public code: number = 0;
    //响应描述，例如错误信息
    public msg: string;
    //返回数据，一般成功时返回的数据
    public data: any;

    //响应类型
    public contentType(): string {
        return ContentType_html;
    }

    //设置响应状态 code(!=0||!=200）则为错误， msg为状态码
    public stat(code: number, msg?: string) {
        this.code = code;
        this.msg = msg;
        return this;
    }

    //放置响应数据
    public put(data: any) {
        this.data = data;
        return this;
    }

    //编码
    public encode(): any {
        if (Buffer.isBuffer(this.data)) {
            return this.data;
        }
        return String(this.data);
    }

    //输出到http请求中
    public out(ctx: AbsHttpCtx) {
        ctx.sendStr(this.encode(), this.contentType());
    }

    //删除自身属性
    public free() {
        Object.keys(this).forEach(k => delete this[k]);
        return this;
    }

    //使用datas到自身所有属性
    public edit(datas: { [index: string]: any }, free: boolean = true) {
        this.free();
        for (var k in datas) {
            this[k] = datas[k];
        }
        return this;
    }
}

//text编码writer
export class TextRes extends AbsRes {
}

//xml编码writer
export class XmlRes extends AbsRes {
    public contentType(): string {
        return ContentType_xml;
    }

    public out(ctx: AbsHttpCtx) {
        ctx.sendXml(this, this.contentType());
    }
}

//xml编码writer
export class XmlDataRes extends XmlRes {
    public out(ctx: AbsHttpCtx) {
        ctx.sendXml(this.data === undefined ? "" : this.data, this.contentType());
    }
}

//json编码writer
export class JsonRes extends AbsRes {
    public contentType(): string {
        return ContentType_json;
    }

    public encode(): any {
        return JSON.stringify(this);
    }

    public out(ctx: AbsHttpCtx) {
        ctx.sendJson(this, this.contentType());
    }
}

//msgpack编码writer
export class MsgpackRes extends AbsRes {
    public contentType(): string {
        return ContentType_msgpack;
    }

    public encode(): any {
        return msgpack.encode(this);
    }

    public out(ctx: AbsHttpCtx) {
        ctx.sendMsgpack(this, this.contentType());
    }
}

export interface BaseParamRule {
    option?: boolean, //是否可选
    default?: any, //默认值
    min?: number | bigint,  //最小值
    max?: number | bigint,  //最大值
    in?: Array<any>, //范围内的可选项
    regexp?: RegExp  //正则判断
    each?: boolean,//如果是数组，针对每项进行检测=默认是false
}

//api参数规则
export interface ApiParamRule extends BaseParamRule {
    //参数来源= get/post/header/cookie/path/socket/any/*
    src?: string,
    //参数名字=从数据源中获取的名字，代替变量默认名字
    name?: string,
    //自定义判断转换函数，返回null则表示转换失败
    check_convert?: (d: any) => any,
    //如果是数组类型type，传入参数是字符串，则可以定义separator切分成数组。（例如开发工具中使用）
    separator?: string,
    //转换类型--自动抓取定义
    type?: Function,
    //专用描述
    desc?: string,
    //开发工具生成需要-多行输入（支持换行）
    multline?: boolean,
}

/**
 * 检测参数是否符合规则
 * @param type 参数的类型定义
 * @param val  测试的实际值
 * @param rule 设置的测试规则
 * @constructor
 */
export function CheckBaseParamRule(type: any, val: any, rule: BaseParamRule): boolean {
    if (type == Number) {
        if (isNaN(val) ||
            (rule.min != undefined && val < rule.min) || (rule.max != undefined && val > rule.max) ||
            (rule.in && !rule.in.includes(val))
        ) {
            return false;
        }
    } else if (type == global["BigInt"]) {
        var tmp = val;
        if (
            (rule.min != undefined && tmp < rule.min) || (rule.max != undefined && tmp > rule.max) ||
            (rule.in && !rule.in.includes(tmp))
        ) {
            return false;
        }
    } else if (type == String) {
        var size = val.length;
        if (
            (rule.min != undefined && size < rule.min) || (rule.max != undefined && size > rule.max) ||
            (rule.in && !rule.in.includes(val)) ||
            (rule.regexp && !rule.regexp.test(val))
        ) {
            return false;
        }
    } else if (type == Date) {
        var time = (<Date>val).getTime();
        if (
            (rule.min != undefined && time < rule.min) || (rule.max != undefined && time > rule.max)
        ) {
            return false;
        }
    } else if (rule.each && val != null) {//逐项检测
        var eachArr = null;
        if (Array.isArray(val) || util.isTypedArray(val)) {
            eachArr = val;
        } else if (util.isObject(val)) {
            eachArr = Object.values(val);
        }
        if (eachArr) {
            for (var x = 0; x < eachArr.length; x++) {
                var eachItem: any = eachArr[x];
                if (rule.in && !rule.in.includes(eachItem)) {
                    return false
                }
                if (Number.isFinite(eachItem)) {
                    if ((rule.min != undefined && eachItem < rule.min) || (rule.max != undefined && eachItem > rule.max)) {
                        return false;
                    }
                } else if (util.isString(eachItem)) {
                    if ((rule.min != undefined && eachItem.length < rule.min) || (rule.max != undefined && eachItem.length > rule.max)) {
                        return false;
                    }
                }
            }
        }
    }
    return true;
}

//api-方法标记参数
export interface ApiRouting {
    //http访问方法
    method: string,
    //访问路径定义，不写则默认函数名or类名
    path: string,
    //方法的编码形式访问码
    code: number,
    //源-方法名
    key: string,
    //本函数的路由-参数规则
    rules: Array<ApiParamRule>,
    //权限函数：返回true/false表示是否允许访问
    filter?: ApiFilterHandler,
    //序列化结果类
    res?: new () => AbsRes,
    //是否需要忽略类路径（避免前缀追加问题）
    absolute?: boolean,
}

//api过滤器参数
export interface ApiFilterHandler {
    (ctx: AbsHttpCtx): boolean;
}

interface ApiRoute{
    //访问路径定义，不写则默认函数名or类名
    path?: string,
    //权限函数：返回true/false表示是否允许访问
    filter?: ApiFilterHandler,
    //序列化结果类
    res?: new () => AbsRes,
}

//路由-类型参数
export interface ApiMethod extends ApiRoute{
    //是否需要忽略类路径（避免前缀追加问题）
    absolute?: boolean,
}

//类标记参数
export interface ApiClass extends ApiRoute {
    //本类下面函数的通用的参数规则
    baseRules?: Array<ApiParamRule>,
}

//API调用错误
export class ApiRunError extends Error {
    public code: number;

    constructor(message: string, code: number = 500) {
        super(message);
        // this.name="ApiRunError";
        this.code = code;
    }
}

//基础上下文
export abstract class AbsHttpCtx {
    pathArg: string;
    writer: AbsRes & { path?: string };
    debugMark: { ticket?: string, uin?: any };//调试-输出标记的用户信息
    public abstract hasFile(k: string): boolean

    public abstract getFileInfo(k: string): { fileName: string, contentType: string, body: Class_SeekableStream }

    //请求path
    public abstract getPath(): string

    public abstract isHadBody(): boolean

    public abstract hasParam(k: string): boolean

    public abstract hasQuery(k: string): boolean

    public abstract hasPart(k: string): boolean

    public abstract getBody(): any

    public abstract getQuery(): any

    public abstract getHeaders(): any

    public abstract getCookie(k: string): string

    public abstract getSocket(): Class_Socket

    public abstract findParam(k: string)

    //写响应头
    public abstract writeHeader(headers: any)

    //添加cookie响应
    public abstract addCookie(cookie: Class_HttpCookie);

    //发送一个json编码对象
    public abstract sendJson(obj: any, contentType?: string/*="text/html; charset=utf8"*/)

    //发送一个msgpack编码对象
    public abstract sendMsgpack(obj: any, contentType?: string/*="text/html; charset=utf8"*/)

    //发送一个xml编码对象
    public abstract sendXml(xml: any, contentType?: string/*="text/html; charset=utf8"*/)

    //发送一个html文档
    public abstract sendStr(html: string | Class_Buffer, contentType?: string/*="text/html; charset=utf8"*/)

    //发送一个二进制
    public abstract sendBuf(buf: Class_Buffer, contentType?: string)

    //是否真的web请求
    public abstract isReal(): boolean;

    //释放内存
    public abstract free(): void;

    /**
     * api处理完后处理
     * @param fn 处理方法
     * @param args 处理方法的参数
     * @param uniqueFnId 唯一ID防止重复执行
     */
    public abstract after(fn: Function, args?: any[], uniqueFnId?: string);

    //执行api后续完结函数
    public abstract runAfters();

    protected debug(obj) {
        Facade._hookDebug && Facade._hookDebug({
            path: this.getPath(),
            query: this.getQuery(),
            body: this.getBody(),
            headers: this.getHeaders(),
            mark: this.debugMark
        }, obj);
    }
}

//http-请求上下文关联
export class ApiHttpCtx extends AbsHttpCtx {
    public req: Class_HttpRequest;
    public res: Class_HttpResponse;
    private b: any;
    public pathArg: string;
    public writer: AbsRes & { path?: string };
    public debugMark: { ticket?: string, uin?: any };//调试-输出标记的用户信息
    constructor(req: Class_HttpRequest, pathArg?: string, writer?: AbsRes) {
        super();
        this.req = req;
        this.res = req.response;
        this.pathArg = pathArg;
        this.writer = writer;
    }

    //请求是否包含post/put数据
    public isHadBody() {
        return this.req.body.size() > 0;
    }

    //是否传统form请求
    public isCtForm(tag: string = "form") {
        var ct: string = this.req.headers["Content-Type"];
        return ct != null && ct.includes(tag);
    }

    //是否Json请求头
    public isCtJson() {
        var ct: string = this.req.headers["Content-Type"];
        return ct != null && ct.includes("json");
    }

    //是否xml请求头
    public isCtXml() {
        var ct: string = this.req.headers["Content-Type"];
        return ct != null && ct.includes("xml");
    }

    //是否msgpack请求头
    public isCtMsgpack() {
        var ct: string = this.req.headers["Content-Type"];
        return ct != null && ct.includes("msgpack");
    }

    //解析或者获取上传的body对象：需要post/put
    public getBody(): any {
        if (this.b) {
            return this.b;
        }
        if (!this.isHadBody()) {
            return null;
        }
        this.b = this.req.data;
        if (Buffer.isBuffer(this.b)) {
            if (this.isCtForm()) {
                this.b = this.req.form;
            } else if (this.isCtXml()) {
                this.b = require("pf_xml").xmlToObjNoAttr(this.req.data.toString());
            } else if (this.b.length > 1) {
                let head = this.b.readUInt8(0), end = this.b.readUInt8(this.b.length - 1);
                if ((head == 123 && end == 125) || (head == 91 && end == 93)) {//[] {}
                    this.b = JSON.parse(this.b.toString());
                }
            }
        }
        return this.b;
    }

    //request=post/put/get
    public hasParam(k: string): boolean {
        return this.hasPart(k) || this.hasQuery(k);
    }

    //是否有 -url的query参数
    public hasQuery(k: string): boolean {
        return this.req.query.has(k);
    }

    //是否有-post/put字段
    public hasPart(k: string): boolean {
        if (!this.isHadBody()) {
            return false;
        }
        var b = this.getBody();
        return b && b.hasOwnProperty(k);
    }

    //判断是有上传指定key的文件
    public hasFile(k: string): boolean {
        if (this.isHadBody() && this.isCtForm("multipart/form-data")) {
            return UploadFileInfo.check(this.req.form.first(k));
            // var v=this.req.form.first(k);
            // return v && v.fileName && v.body && util.isFunction(v.body.eof);
            //form:field={fileName:string, contentType:"application/octet-stream", body:SeekableStream}
        }
        return false;
    }

    //请求METHOD
    public getMethod(): string {
        return this.req.method;
    }

    //请求path
    public getPath(): string {
        return this.req.address;
    }

    //先从get中招木有在从post中找
    public findParam(k: string) {
        if (this.req.query.has(k)) {
            return this.req.query.first(k);
        }
        if (this.hasPart(k)) {
            return this.getBody()[k];
        }
        return undefined;
    }

    //获取get请求参数
    public getQuery() {
        return this.req.query;
    }

    //获取请求的header
    public getHeaders() {
        return this.req.headers;
    }

    public getCookie(k: string): string {
        return this.req.cookies.first(k);
    }

    //获取form表单中的文件对象
    public getFileInfo(k: string): { fileName: string, contentType: string, body: Class_SeekableStream } {
        return <any>type_convert(UploadFileInfo, this.req.form.first(k))
    }

    //请求的socket属性
    public getSocket() {
        return <Class_Socket>this.req.socket;
    }

    //写响应状态【默认200不用】
    public writeStatus(statusCode: number, statusMessage?: string, headers?: any) {
        this.res.statusCode = statusCode;
        if (statusMessage) this.res.statusMessage = statusMessage;
        this.writeHeader(headers);
    }

    //写响应头
    public writeHeader(headers: any) {
        if (headers) {
            headers["Access-Control-Expose-Headers"] = Object.keys(headers).join(",");
            this.res.setHeader(headers);
        }
        if (this.res.statusCode >= 500) {
            this.res.setHeader("Connection", "close");
        }
    }

    //添加cookie响应
    public addCookie(cookie: Class_HttpCookie) {
        this.res.addCookie(cookie);
    }

    //发送一个json编码对象
    public sendJson(obj: any, contentType?: string) {
        this.send_res(obj, <any>JSON.stringify(obj), contentType);
    }

    //发送一个msgpack编码对象
    public sendMsgpack(obj: any, contentType?: string) {
        this.send_res(obj, msgpack.encode(obj), contentType);
    }

    //发送一个xml编码对象
    public sendXml(xml: any, contentType?: string) {
        var src = xml;
        if (!util.isString(xml) || xml.charAt(0) != '<') {
            xml = require("pf_xml").objToXmlNoAttr(xml);
        }
        this.send_res(src, xml, contentType);
    }

    //发送一个html文档
    public sendStr(html: string | Class_Buffer, contentType?: string) {
        this.send_res(html, html, contentType);
    }

    public sendBuf(buf: Class_Buffer, contentType?: string) {
        this.send_res(buf, buf, contentType);
    }

    private send_res(src: any, data: string | Class_Buffer, contentType?: string) {
        this.debug(src);
        if (contentType) {
            this.res.headers["Content-Type"] = contentType;
        }
        this.res.write(<Class_Buffer>data);
        this.req.end();
    }

    //处理cors跨域请求
    public sendCors(orgin: any = "*", alowHeaders: string = "*", exposeHeaders: string = "*"): boolean {
        if (this.req.method != "OPTIONS") {
            return false;
        }
        if (orgin != "*") {
            if (util.isFunction(orgin)) {
                orgin = orgin(this.req.headers["Origin"], this.req.address);
            } else if (util.isRegExp(orgin)) {
                if (orgin.test(this.req.headers["Origin"])) {
                    orgin = this.req.headers["Origin"];
                }
            }
        }
        if (orgin == null) {
            this.res.writeHead(403, "reject", {});
        } else {
            var h = {
                "Access-Control-Allow-Origin": orgin,
                "Access-Control-Allow-Headers": alowHeaders,
                "Access-Control-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Expose-Headers": exposeHeaders,
                "Access-Control-Max-Age": "3600",
            };
            this.req.setHeader(h);
            this.req.end();
        }
        return true;
    }

    public isReal() {
        return true;
    }

    /**
     * 跳转到url
     * @param url
     */
    public redirect(url: string) {
        this.writer = null;
        this.req.response.redirect(url);
    }

    /**
     * 释放内部引用
     */
    public free() {
        for (let k in this) {
            delete this[k];
        }
    }

    private afters: Map<string | Symbol, [Function, any[]]>
    private afterI: number;

    public after(fn: Function, args?: any[], uniqueFnId?: string) {
        if (this.afterI == null) {
            this.afters = new Map();
            this.afterI = 1;
        }
        if (!uniqueFnId) {
            this.afters.set(Symbol(this.afterI++), [fn, args]);
        } else {
            this.afters.set(uniqueFnId, [fn, args]);
        }
    }

    public runAfters() {
        if (!this.afters) return;
        let a = this.afters;
        this.afters = null;
        for (let v of a.values()) {
            v[0](...v[1]);
        }
    }
}

//websocket-请求上下文关联
export class WsApiHttpCtx extends AbsHttpCtx {
    private static EMPTY = Object.freeze({});
    private src: any;//[request_id,api_path,params_obj,header_obj]
    private con;//net.Socket
    public pathArg: string;
    public writer: AbsRes & { path?: string };
    private _path: string;
    private paramArg: any;//post+get
    private headerArg: any;//headers
    public debugMark: { ticket?: string, uin?: any };//调试-输出标记的用户信息
    //链接socket, 事件消息
    constructor(con, msg: any) {
        super();
        this.con = con;
        this.src = msg;
        this._path = msg[1];
        this.paramArg = msg[2];
        this.headerArg = msg[3];
        this.pathArg = msg[4];
    }

    public hasFile(k: string): boolean {
        return false;
    }

    public getFileInfo(k: string) {
        return null;
    }

    //请求path
    public getPath(): string {
        return this._path;
    }

    public isHadBody(): boolean {
        return this.paramArg != null;
    }

    public hasParam(k: string): boolean {
        return this.getParams().hasOwnProperty(k);
    }

    public hasQuery(k: string): boolean {
        return this.getQuery().hasOwnProperty(k);
    }

    public hasPart(k: string) {
        return this.getBody().hasOwnProperty(k);
    }

    private getParams(): any {
        return this.paramArg || WsApiHttpCtx.EMPTY;
    }

    public getBody(): any {
        return this.getParams();
    }

    public getQuery(): any {
        return this.getParams();
    }

    public getHeaders() {
        return this.headerArg || WsApiHttpCtx.EMPTY;
    }

    public getCookie(): string {
        return undefined;
    }

    public getSocket() {
        return this.con;
    }

    public findParam(k: string) {
        return this.getParams()[k];
    }

    //写响应头
    public writeHeader(headers: any) {
    }

    //添加cookie响应
    public addCookie(cookie: Class_HttpCookie) {

    }

    //发送一个json编码对象
    public sendJson(obj: any, contentType?: string) {
        this.sendStr(JSON.stringify(obj), contentType);
    }

    //发送一个msgpack编码对象
    public sendMsgpack(obj: any, contentType?: string) {
        this.debug(obj);
        this.sendBuf(msgpack.encode(obj), contentType);
    }

    //发送一个xml编码对象
    public sendXml(xml: any, contentType?: string) {
        this.debug(xml);
        if (!util.isString(xml) || xml.charAt(0) != '<') {
            xml = require("pf_xml").objToXmlNoAttr(xml);
        }
        this.sendStr(xml, contentType);
    }

    //发送一个字符串
    public sendStr(str: string | Class_Buffer, contentType?: string) {
        this.debug(str);
        this.sendTo(Buffer.isBuffer(str) ? <Class_Buffer>str : Buffer.from(<string>str), false, contentType);
    }

    //发送一段字节
    public sendBuf(buf: Class_Buffer, contentType?: string) {
        this.debug(buf);
        this.sendTo(buf, true, contentType);
    }

    protected sendTo(buf: Class_Buffer, isBlob: boolean, contentType?: string) {
        if (this.con.readyState == 1) {
            let t = Buffer.alloc(buf.length + 9);
            t.writeInt8(isBlob ? 0x01 : 0x02, 0);
            t.writeInt64BE(this.src[0], 1);
            buf.copy(t, 9);
            this.con.send(t);
        } else {
            this.debug("sendToClosedWebSocket");
        }
    }

    // public static send404(conn: Class_WebSocket, path: string, reqId: number) {
    //     new WsApiHttpCtx(conn, [reqId, path]).sendJson({code: 404, msg: path});
    // }

    public isReal() {
        return false;
    }

    /**
     * 释放内部引用
     */
    public free() {
        for (var k in this) {
            delete this[k];
        }
    }

    private afters: Map<string | Symbol, [Function, any[]]>
    private afterI: number;

    public after(fn: Function, args?: any[], uniqueFnId?: string) {
        if (this.afterI == null) {
            this.afters = new Map();
            this.afterI = 1;
        }
        if (!uniqueFnId) {
            this.afters.set(Symbol(this.afterI++), [fn, args]);
        } else {
            this.afters.set(uniqueFnId, [fn, args]);
        }
    }

    public runAfters() {
        if (!this.afters) return;
        var a = this.afters;
        this.afters = null;
        for (var v of a.values()) {
            v[0](...v[1]);
        }
    }
}