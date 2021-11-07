import * as fs from "fs";
import * as hash from "hash";
import * as util from "util";
import * as url from "url";
import * as http from "http";
import {xmlToObjNoAttr} from "pf_xml";
import * as querystring from "querystring";


export class OSSClient {
    constructor(protected conf: { accessKeyId: string, accessKeySecret: string, securityToken?: string, endpoint: string }) {
    }
}

/**
 * OSS存储Object操作相关
 */
export class OSSObject extends OSSClient {
    private bucketEndpoint: string;
    private bucketHost: string;

    constructor(protected conf: { accessKeyId: string, accessKeySecret: string, securityToken?: string, endpoint: string, bucket: string, outUri?:string }) {
        super(conf);
        this.bucketEndpoint = buildEndpoint(conf.endpoint, conf.bucket);
        this.bucketHost = url.parse(this.bucketEndpoint).host;
    }

    /**
     * 服务端生成post上传签名参数。使用上根据自己情况加工
     * @param policy
     * @see https://help.aliyun.com/document_detail/92883.html
     */
    public getUploadParams(policy:any){
        let policyStr = Buffer.from(util.isString(policy) ? policy:JSON.stringify(policy)).toString("base64");
        const signature:string = hash.hmac_sha1(<any>this.conf.accessKeySecret, <any>policyStr).digest("base64");
        return {
            OSSAccessKeyId: this.conf.accessKeyId,
            policy: policyStr,
            signature: signature,
        };
    }

    /**
     * 查看对象head
     * @param key
     */
    public headObject(key: string): { [index: string]: string } {
        let headers: any = this._get_base_headers();
        headers = _signatureFixAuthorization(this.conf, key, "HEAD", headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.request('HEAD', url, {headers: headers});
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
        let headers: any = this._get_base_headers();
        headers = _signatureFixAuthorization(this.conf, key, 'DELETE', headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.del(url, {headers: headers});
            return rsp.statusCode >= 200 && rsp.statusCode < 300;
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
        let headers: any = {
            ...this._get_base_headers(),
            "Content-Type": "text/xml",
            "Content-MD5": hash.md5(buffer).digest("base64")
        };
        let key = '?delete';
        let query = {};
        headers = _signatureFixAuthorization(this.conf, key, "POST", headers, query);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.post(url, {headers: headers, query: query, body: buffer});
            // console.log(rsp.statusCode, rsp.headers.toJSON(), rsp.data)
            return rsp.statusCode == 200;
        } catch (e) {
            console.error(key, e);
            return false;
        }
    }

    /**
     * 获取Object当前版本的元数据信息
     * @param key
     */
    public getObjectMeta(key: string) {
        let headers: any = this._get_base_headers();
        key = key + '?objectMeta';
        headers = _signatureFixAuthorization(this.conf, key, "HEAD", headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.request('HEAD', url, {headers: headers});
            if (rsp.statusCode = 200) {
                // return rsp.readAll();
                return rsp.headers.toJSON();
            }
            return undefined;
        } catch (e) {
            console.error(key, e);
            return undefined;
        }
    }

    /**
     * 获取对象值，如果获取失败，返回undefiend
     * @param key
     * @returns
     */
    public getObject(key: string): any {
        let headers: any = this._get_base_headers();
        headers.Authorization = _signatureFixAuthorization(this.conf, key, "GET", headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.get(url, {headers: headers});
            if (rsp.statusCode = 200) {
                // return rsp.readAll();
                return rsp.data;
            }
            return undefined;
        } catch (e) {
            console.error(key, e);
            return undefined;
        }
    }

    /**
     * copy数据
     * @param key
     * @param sourceBucketKey
     */
    public copyObject(key: string, sourceBucketKey: string) {
        let headers: any = {
            ...this._get_base_headers(),
            "x-oss-copy-source": sourceBucketKey
        };
        headers = _signatureFixAuthorization(this.conf, key, "PUT", headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.put(url, {headers: headers});
            return rsp.statusCode == 200;
        } catch (e) {
            console.error(key, e);
            return false;
        }
    }

    /**
     * 放置数据
     * @param key
     * @param buffer
     * @param contentType
     */
    public putData(key: string, buffer: Class_Buffer, contentType: string = "application/octet-stream", extHeaders: any = {}) {
        let headers: any = {
            ...this._get_base_headers(),
            ...extHeaders,
            "Content-Type": contentType
        };
        let query = {};
        headers = _signatureFixAuthorization(this.conf, key, "PUT", headers, query);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.put(url, {headers: headers, query: query, body: buffer});
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
        let buffer = fs.readFile(fileName);
        let headers: any = {
            ...this._get_base_headers(),
            ...extHeaders,
            "Content-Type": getMimeType(fileName),
        };

        let query = {};
        headers = _signatureFixAuthorization(this.conf, key, "PUT", headers, query);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.put(url, {headers: headers, query: query, body: buffer});
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
    public putObjectACL(key: string, acl: string) {
        let headers = {...this._get_base_headers(), "x-oss-object-acl": acl};
        headers = _signatureFixAuthorization(this.conf, key, "PUT", headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.put(url, {headers: headers});
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
    public getObjectACL(key: string) {
        key = key + '?acl';
        let headers: any = this._get_base_headers();
        headers.Authorization = _signatureFixAuthorization(this.conf, key, "GET", headers);
        let url = this.bucketEndpoint + '/' + key;
        try {
            let rsp = http.get(url, {headers: headers});
            if (rsp.statusCode = 200) {
                // return rsp.readAll();
                return xmlToObjNoAttr(rsp.data.toString());
            }
            return undefined;
        } catch (e) {
            console.error(key, e);
            return undefined;
        }
    }

    /**
     * 生成带授权签名的url
     * @param key
     * @param options
     */
    public signatureUrl(key: string, options: { method: string, expires: number } & { [index: string]: any } = {
        method: "GET",
        expires: 300
    }) {
        // (bucket:string, name:string, httpMethod:string, headers:any)
        const expires = Math.floor(Date.now() / 1000) + (options.expires || 1800);

        if (this.conf.securityToken) {
            options['security-token'] = this.conf.securityToken;
        }

        // const signRes = _signatureForURL(this.options.accessKeySecret, options, resource, expires);
        const signRes = _signatureForURL(this.conf, options, options.method || "GET", key, expires)

        let url_query = {
            OSSAccessKeyId: this.conf.accessKeyId,
            Expires: expires,
            Signature: signRes.Signature,
            ...signRes.subResource
        };

        return this.fullOutUrl(key) + '?' + querystring.stringify(url_query);
    }

    /**
     * 外网不带参数的全路径地址
     * @param key
     */
    public fullOutUrl(key: string){
        return this.get_out_uri()+'/'+key;
    }
    private get_out_uri(){
        return (this.conf.outUri||this.bucketEndpoint.replace("-internal.","."));
    }

    private _get_base_headers() {
        let h: any = {"Date": new Date()["toGMTString"]()};
        if (this.conf.securityToken) {
            h["x-oss-security-token:security-token"] = this.conf.securityToken;
        }
        return h;
    }
}

function _signatureFixAuthorization(conf: { accessKeyId: string, accessKeySecret: string, bucket: string }, key: string, httpMethod: string, headers: any, query = {}) {
    let canonicalString = SignUtils.buildCanonicalString(httpMethod, headers,
        query, conf.bucket, key);
    headers.Authorization = 'OSS ' + conf.accessKeyId + ':' + computeSignature(conf.accessKeySecret, canonicalString);
    return headers;
}

function _signatureForURL(conf: { accessKeyId: string, accessKeySecret: string, bucket: string }, options: any, httpMethod: string, key: string, expires: number) {
    const headers: any = {};
    const subResource: any = {};

    if (options.process) {
        subResource['x-oss-process'] = options.process;
    }
    if (options.response) {
        Object.keys(options.response).forEach((k) => {
            subResource[`response-${k.toLowerCase()}`] = options.response[k];
        });
    }
    Object.keys(options).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.indexOf('x-oss-') === 0) {
            headers[lowerKey] = options[key];
        } else if (lowerKey.indexOf('content-md5') === 0) {
            headers[key] = options[key];
        } else if (lowerKey.indexOf('content-type') === 0) {
            headers[key] = options[key];
        } else if (lowerKey !== 'expires' && lowerKey !== 'response' && lowerKey !== 'process' && lowerKey !== 'method') {
            subResource[lowerKey] = options[key];
        }
    });

    if (Object.prototype.hasOwnProperty.call(options, 'security-token')) {
        subResource['security-token'] = options['security-token'];
    }

    if (Object.prototype.hasOwnProperty.call(options, 'callback')) {
        const json: any = {
            callbackUrl: encodeURI(options.callback.url),
            callbackBody: options.callback.body
        };
        if (options.callback.host) {
            json.callbackHost = options.callback.host;
        }
        if (options.callback.contentType) {
            json.callbackBodyType = options.callback.contentType;
        }
        subResource.callback = new Buffer(JSON.stringify(json)).toString('base64');

        if (options.callback.customValue) {
            const callbackVar = {};
            Object.keys(options.callback.customValue).forEach((key) => {
                callbackVar[`x:${key}`] = options.callback.customValue[key];
            });
            subResource['callback-var'] = new Buffer(JSON.stringify(callbackVar)).toString('base64');
        }
    }
    const canonicalString = SignUtils.buildCanonicalString(httpMethod, headers, subResource, conf.bucket, key, expires.toString());

    return {
        Signature: computeSignature(conf.accessKeySecret, canonicalString),
        subResource
    };
}

abstract class SignUtils {
    public static AUTHORIZATION = 'Authorization';
    public static CONTENT_MD5 = 'Content-Md5';
    public static CONTENT_TYPE = 'Content-Type';
    public static DATE = 'Date';

    private static OSS_PREFIX = 'x-oss-';
    private static NEW_LINE = "\n";
    private static SIGNED_PARAMTERS = [
        "acl", "uploadId", "partNumber", "uploads",
        "response-cache-control",
        "response-content-disposition",
        "response-content-encoding",
        "response-content-language",
        "response-content-type",
        "response-expires",
    ];

    public static buildCanonicalString(httpMethod: string, headers: any, params: any, bucket: string, objectKey: string, expires?: string) {
        let ossHeaders = Object.keys(headers).reduce((p, k) => {
            if (k.startsWith(this.OSS_PREFIX)) {
                p[k] = headers[k];
            }
            return p;
        }, {});
        let ossHeaderContent = Object.entries(ossHeaders).reduce((p, c) => {
            p.push(c[0] + ':' + c[1]);
            return p;
        }, []);
        let minHeaders = Object.keys(headers).reduce((p, k) => {
            let lk = k.toLowerCase();
            if (p.hasOwnProperty(lk)) {
                p[lk] = headers[k];
            }
            return p;
        }, {"content-md5": "", "content-type": "", "date": ""});
        return [
            httpMethod.toUpperCase(),
            minHeaders['content-md5'],
            minHeaders['content-type'],
            expires || headers['x-oss-date'] || minHeaders['date'],
            ...ossHeaderContent,
            this.buildCanonicalizedResource(this.buildResourcePath(bucket, objectKey), params)
        ].join(this.NEW_LINE);
    }

    private static buildCanonicalizedResource(resourcePath: string, parameters: any) {
        let ps = !parameters ? "" : (
            util.isString(parameters) ? String(parameters) :
                Object.keys(parameters).sort().reduce((p, k) => {
                    if (!this.SIGNED_PARAMTERS.includes(k)) {
                        if (util.isNullOrUndefined(parameters[k])) {
                            p.push(`${k}=`);
                        } else {
                            p.push(`${k}=${parameters[k]}`);
                        }
                    }
                    return p;
                }, []).join("&"));
        return ps.length > 0 ? `${resourcePath}?${ps}` : resourcePath;
    }

    private static buildResourcePath(bucket: string, key: string) {
        if (!bucket) {
            return '/';
        }
        if (!key) {
            return `/${bucket}/`;
        }
        return `/${bucket}/${key}`;
    }
}

function computeSignature(k, d) {
    return hash.hmac_sha1(k, d).digest("base64");
}

function buildEndpoint(endpoint: string, bucket: string) {
    let info = url.parse(endpoint);
    let bucketEndpoint = info.host;
    if (bucket && bucketEndpoint.startsWith(bucket+".")==false) {
        bucketEndpoint = `${bucket}.${bucketEndpoint}`;
    }
    if (info.protocol) {
        bucketEndpoint = `${info.protocol}//${bucketEndpoint}`;
    }
    if (info.port) {
        bucketEndpoint = `${bucketEndpoint}:${info.port}`;
    }
    return bucketEndpoint;
}

function getMimeType(fileName: string, defaultMt = "application/octet-stream") {
    return require("mime-types").lookup(fileName) || defaultMt;
}