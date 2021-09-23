import * as url from "url";
import * as http from "http";
import * as hash from "hash";
import * as fs from "fs";
import {sigHmacSha1} from "./helper";
import {xmlToObjNoAttr} from "pf_xml";

/**
 * 腾讯云cos简易使用client
 */
export class COSClient {
    constructor(protected conf: { secretId: string, secretKey: string, endpoint:string, bucket: string }) {
    }
}
export class COSBucket extends COSClient{
    private reqUri:string;
    constructor(protected conf: { secretId: string, secretKey: string, endpoint:string, bucket: string, outUri?:string }) {
        super(conf);
        this.reqUri = buildEndpoint(conf.endpoint, conf.bucket);
    }
    public listObjects(opt:{prefix?:string, delimiter?:string, "encoding-type"?:string, marker?:string, "max-keys"?:number}){
        let uri = this.reqUri+'/';
        let query = opt;
        let headers: any = _signatureFixAuthorization(this.conf, query, "GET", uri);
        try {
            let rsp = http.request('GET', uri, {headers: headers, query:query});
            if (rsp.statusCode == 200) {
                return xmlToObjNoAttr(rsp.data.toString());
            }
            console.error("list_object_fail:%s", uri, (rsp.data||"").toString());
            return null;
        } catch (e) {
            console.error("list_object_fail:%s", uri, e);
            return undefined;
        }
    }
}
export class COSObject extends COSClient{
    private reqUri:string;
    private outUri:string;
    constructor(protected conf: { secretId: string, secretKey: string, endpoint:string, bucket: string, outUri?:string }) {
        super(conf);
        this.reqUri = buildEndpoint(conf.endpoint, conf.bucket);
        this.outUri = conf.outUri ? conf.outUri:buildCdnEndPoint(this.reqUri);
    }

    /**
     * 查看对象head
     * @param key
     */
    public headObject(key: string): { [index: string]: string } {
        let uri = this.reqUri+'/'+key;
        let headers: any = _signatureFixAuthorization(this.conf, {}, "HEAD", uri);
        try {
            let rsp = http.request('HEAD', uri, {headers: headers});
            if (rsp.statusCode == 200) {
                return rsp.headers.toJSON();
            }
            return null;
        } catch (e) {
            console.error(key, e);
            return undefined;
        }
    }


    /**
     * 单个删除
     * @param key
     */
    public deleteObject(key: string): boolean {
        let uri = this.reqUri+'/'+key;
        let headers = _signatureFixAuthorization(this.conf, {}, "DELETE", uri);
        try {
            let rsp = http.del(uri, {headers: headers});
            return rsp.statusCode == 200 || rsp.statusCode == 204 || rsp.statusCode == 404;
        } catch (e) {
            console.error(key, e);
            return false;
        }
    }

    /**
     * 批量删除
     * @param keys
     */
    public deleteMultObject(keys: string[]): boolean {
        let xml = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet><Object>${keys.reduce((p, k) => {
            p.push(`<Key>${k}</Key>`);
            return p;
        }, []).join("")}</Object></Delete>`;
        let buffer = Buffer.from(xml);
        let uri = this.reqUri+'?delete';
        let headers = _signatureFixAuthorization(this.conf, {
            "Content-Type": "text/xml",
            "Content-MD5": hash.md5(buffer).digest("base64")
        }, "POST", uri);
        try {
            let rsp = http.post(uri, {headers: headers, body: buffer});
            // console.log(rsp.statusCode, rsp.headers.toJSON(), rsp.data)
            return rsp.statusCode == 200;
        } catch (e) {
            console.error(uri+":"+keys.join(","), e);
            return false;
        }
    }

    /**
     * 获取对象值，如果获取失败，返回undefiend
     * @param key
     * @returns
     */
    public getObject(key:string):any{
        let uri = this.reqUri+'/'+key;
        let headers: any = _signatureFixAuthorization(this.conf, {}, "GET", uri);
        try {
            let rsp = http.request('GET', uri, {headers: headers});
            if (rsp.statusCode == 200) {
                return rsp.data;
            }
            return null;
        } catch (e) {
            console.error(key, e);
            return undefined;
        }
    }

    /**
     * 接口请求创建一个已存在 COS 的对象的副本，即将一个对象从源路径（对象键）复制到目标路径（对象键）
     * @param path
     * @param source_obj_url
     * @param metaHeaders
     */
    public copyObject(path: string, source_obj_url: string, extHeaders: { [index: string]: string }={}) {
        let uri = this.reqUri+ '/' + path;
        if (source_obj_url.indexOf("://") > 0) {
            source_obj_url = source_obj_url.substr(source_obj_url.indexOf("://") + 3);
        }
        let headers = _signatureFixAuthorization(this.conf, {"x-cos-copy-source": source_obj_url, ...extHeaders}, "PUT", uri);
        let rsp = http.put(uri, {headers:headers});
        if (rsp.statusCode == 200) {
            return true;
        }
        return false;
    }

    /**
     * 放置数据
     * @param key
     * @param buffer
     * @param contentType
     */
    public putData(key: string, buffer: Class_Buffer, contentType: string = "application/octet-stream", extHeaders: any = {}) {
        let uri = this.reqUri+'/'+key;
        let headers: any = {
            ...extHeaders,
            "Content-Type": contentType
        };
        if (buffer.length == 0) {
            headers["Content-Length"] = 0;
        }
        headers = _signatureFixAuthorization(this.conf, headers, "PUT", uri);
        try {
            let rsp = http.put(uri, {headers: headers, body: buffer});
            return rsp.statusCode == 200;
        } catch (e) {
            console.error(key, e);
            return false;
        }
    }


    /**
     * 放置文件
     * @param key
     * @param fileName
     */
    public putFile(key: string, fileName: string, extHeaders: any = {}) {
        let uri = this.reqUri+'/'+key;
        let buffer = fs.readFile(fileName);
        let headers: any = {
            "Content-Type": getMimeType(fileName),
            ...extHeaders,
        };
        headers = _signatureFixAuthorization(this.conf, headers, "PUT", uri);
        try {
            let rsp = http.put(uri, {headers: headers, body: buffer});
            return rsp.statusCode == 200;
        } catch (e) {
            console.error(key, e);
            return false;
        }
    }


    /**
     * 修改文件（Object）的访问权限（ACL）
     * @param key
     * @param acl
     */
    public putObjectACL(key: string, acl: string, otherAclHeaders:any={}) {
        let uri = this.reqUri+'/'+key+'?acl';
        let headers = _signatureFixAuthorization(this.conf, {"x-cos-acl":acl, ...otherAclHeaders, "Content-Length":0}, "PUT", uri);
        try {
            let rsp = http.put(uri, {headers: headers});
            return rsp.statusCode == 200;
        } catch (e) {
            console.error(key, e);
            return false;
        }
    }
    /**
     * 获取存储空间（Bucket）下某个文件（Object）的访问权限（ACL）
     * @param key
     */
    public getObjectACL(key: string){
        let uri = this.reqUri+'/'+key+'?acl';
        let headers = _signatureFixAuthorization(this.conf, {}, "GET", uri);
        try {
            let rsp = http.get(uri, {headers: headers});
            if(rsp.statusCode == 200){
                return xmlToObjNoAttr(rsp.data.toString());
            }
            return undefined;
        } catch (e) {
            console.error(key, e);
            return undefined;
        }
    }

    public fullOutUrl(key: string){
        return this.outUri+'/'+key;
    }
}

function _signatureFixAuthorization(cfg:{secretId:string, secretKey:string}, headers:any, httpMethod: string, uri: string, expireSecond: number = 3600){
    headers = headers||{};
    headers["Authorization"] = auth_sign(cfg, httpMethod, uri, expireSecond);
    return headers;
}
function auth_sign(cfg:{secretId:string, secretKey:string}, requestMethod: string, uri: string, expireSecond: number = 3600) {
    let urlInfo = url.parse(uri);
    let nowSecond = Math.floor(Date.now() / 1000)
    let signTime = (nowSecond - 90) + ';' + (nowSecond + expireSecond);
    let httpString = requestMethod.toLowerCase() + "\n" + encodeURI(urlInfo["pathname"]) +
        "\n\nhost=" + urlInfo["host"] + "\n";
    let sha1edHttpString = hash.sha1(<any>httpString).digest("hex");
    let stringToSign = "sha1\n" + signTime + "\n" + sha1edHttpString + "\n";
    let signKey = sigHmacSha1(cfg.secretKey, signTime);
    let signature = sigHmacSha1(signKey, stringToSign);
    let authorization = 'q-sign-algorithm=sha1&q-ak=' + cfg.secretId +
        "&q-sign-time=" + signTime + "&q-key-time=" + signTime + "&q-header-list=host&q-url-param-list=&q-signature=" + signature;
    return authorization;
}

function buildEndpoint(endpoint: string, bucket: string) {
    if(!bucket){
        return endpoint;
    }
    let info = url.parse(endpoint);
    let host = info.host;
    if(host.startsWith(bucket)==false){
        host = bucket+"."+host;
    }
    let str:string = `${info.protocol}//${host}`;
    if (info.port) {
        str = `${str}:${info.port}`;
    }
    return str;
}
function buildCdnEndPoint(reqUri:string){
    let a = reqUri.split(".");
    return [a[0],"file",...a.slice(3)].join(".");
}

function getMimeType(fileName: string, defaultMt = "application/octet-stream") {
    return require("mime-types").lookup(fileName) || defaultMt;
}