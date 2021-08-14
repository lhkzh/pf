import * as fs from "fs";
import * as hash from "hash";
import * as util from "util";
import * as url from "url";
import * as http from "http";
import {xmlToObjNoAttr} from "pf_xml";


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

    constructor(protected conf: { accessKeyId: string, accessKeySecret: string, securityToken?: string, endpoint: string, bucket: string }) {
        super(conf);
        this.bucketEndpoint = buildEndpoint(conf.endpoint, conf.bucket);
        this.bucketHost = url.parse(this.bucketEndpoint).host;
    }

    /**
     * 查看对象head
     * @param key
     */
    public headObject(key: string): { [index: string]: string } {
        let headers: any = this._get_base_headers();
        headers = fixHeadersAuthorization(this.conf, key, "HEAD", headers);
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
        headers = fixHeadersAuthorization(this.conf, key, 'DELETE', headers);
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
        headers = fixHeadersAuthorization(this.conf, key, "POST", headers, query);
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
        headers = fixHeadersAuthorization(this.conf, key, "HEAD", headers);
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
        headers.Authorization = fixHeadersAuthorization(this.conf, key, "GET", headers);
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
     * @param buffer
     * @param contentType
     */
    public copyObject(key: string, sourceBucketKey: string) {
        let headers: any = {
            ...this._get_base_headers(),
            "x-oss-copy-source": sourceBucketKey
        };
        headers = fixHeadersAuthorization(this.conf, key, "PUT", headers);
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
        headers = fixHeadersAuthorization(this.conf, key, "PUT", headers, query);
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
        headers = fixHeadersAuthorization(this.conf, key, "PUT", headers, query);
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
        headers = fixHeadersAuthorization(this.conf, key, "PUT", headers);
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
        headers.Authorization = fixHeadersAuthorization(this.conf, key, "GET", headers);
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

    private _get_base_headers() {
        let h: any = {"Date": new Date()["toGMTString"]()};
        if (this.conf.securityToken) {
            h["x-oss-security-token:security-token"] = this.conf.securityToken;
        }
        return h;
    }
}


function fixHeadersAuthorization(conf: { accessKeyId: string, accessKeySecret: string, bucket: string }, key: string, httpMethod: string, headers: any, query = {}) {
    let canonicalString = SignUtils.buildCanonicalString(httpMethod, headers,
        query, conf.bucket, key);
    // query.OSSAccessKeyId = this.conf.accessKeyId;
    // query.Signature = signature;
    headers.Authorization = 'OSS ' + conf.accessKeyId + ':' + hmacSha1Signature(conf.accessKeySecret, canonicalString);
    return headers;
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

    public static buildCanonicalString(httpMethod: string, headers: any, params: any, bucket, objectKey) {
        let xHeaders = {};
        Object.keys(headers).forEach(k => {
            if (k.startsWith(this.OSS_PREFIX)) {
                xHeaders[k] = headers[k];
            }
        });
        Object.keys(params).forEach(k => {
            if (k.startsWith(this.OSS_PREFIX)) {
                xHeaders[k] = params[k];
            }
        })
        let xHeaderString: string = Object.keys(xHeaders).sort().reduce((p, k) => {
            return p + k + ':' + xHeaders[k] + this.NEW_LINE;
        }, "");
        let minHeaders = Object.keys(headers).reduce((p, k) => {
            let lk = k.toLowerCase();
            if (p.hasOwnProperty(lk)) {
                p[lk] = headers[k];
            }
            return p;
        }, {"content-md5": "", "content-type": "", "date": ""});
        return httpMethod + "\n" + minHeaders["content-md5"] + "\n" + minHeaders["content-type"] + "\n" + minHeaders["date"] + "\n" + xHeaderString +
            this.buildCanonicalizedResource(this.buildResourcePath(bucket, objectKey), params);
    }

    private static buildCanonicalizedResource(resourcePath: string, parameters: any) {
        let ps = Object.keys(parameters).sort().reduce((p, k) => {
            if (!this.SIGNED_PARAMTERS.includes(k)) {
                if (util.isNullOrUndefined(parameters[k])) {
                    p.push(`${k}=`);
                } else {
                    p.push(`${k}=${parameters[k]}`);
                }
            }
            return p;
        }, []);
        return ps.length > 0 ? `${resourcePath}?${ps.join('&')}` : resourcePath;
    }

    private static buildResourcePath(bucket: string, key: string) {
        if (!bucket) {
            return '/';
        }
        return `/${bucket}/${key}`;
    }
}

function hmacSha1Signature(k, d) {
    return hash.hmac_sha1(k, d).digest("base64");
}

function buildEndpoint(endpoint: string, bucket: string) {
    let info = url.parse(endpoint);
    let bucketEndpoint = info.host;
    if (bucket) {
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