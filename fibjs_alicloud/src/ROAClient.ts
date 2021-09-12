import * as hash from "hash";
import * as querystring from "querystring";
import * as http from "http";
import {DEFAULT_CLIENT, DEFAULT_UA, makeNonce, sig} from "./helper";
import {xmlToObjNoAttr} from "pf_xml";


export class ROAClient {
    constructor(private conf: { accessKeyId: string, accessKeySecret: string, securityToken?: string, endpoint: string, apiVersion: string }) {
    }

    public put(path: string, query: any = {}, body: string = '', headers: any = {}) {
        return this.request('PUT', path, query, body, headers);
    }

    public post(path: string, query: any = {}, body: string = '', headers: any = {}) {
        return this.request('POST', path, query, body, headers);
    }

    public get(path: string, query: any = {}, body: string = '', headers: any = {}) {
        return this.request('GET', path, query, '', headers);
    }

    public delete(path: string, query: any = {}, body: string = '', headers: any = {}) {
        return this.request('DELETE', path, query, '', headers);
    }

    public request(method: string, uriPattern: string, query: any = {}, body: string | Class_Buffer = '', headers: any = {}) {
        var mixHeaders = Object.assign(this.buildHeaders(), keyLowerify(headers));
        var postBody: Class_Buffer;
        if (body) {
            postBody = Buffer.isBuffer(body) ? <Class_Buffer>body : Buffer.from(<string>body, 'utf8');
            mixHeaders['content-md5'] = hash.md5(postBody).digest('base64');
            // mixHeaders['content-length'] = postBody.length;
        }

        var url = `${this.conf.endpoint}${uriPattern}`;
        if (Object.keys(query).length) {
            url += `?${querystring.stringify(query)}`;
        }

        const stringToSign = buildStringToSign(method, uriPattern, mixHeaders, query);
        // console.log('stringToSign: %s', stringToSign);
        mixHeaders['authorization'] = this.buildAuthorization(stringToSign);

        let opts = postBody ? {headers: mixHeaders, body: postBody} : {headers: mixHeaders};
        let res = http.request(method, url, opts);
        let result = res.data;
        if (Buffer.isBuffer(result)) {
            result = result.toString();
            if (result.charAt(0) == '{') {
                result = JSON.parse(result);
            } else if (result.charAt(0) == '<') {
                result = xmlToObjNoAttr(result.toString());
            }
        }
        if (res.statusCode >= 400) {
            const errorMessage = result.Message || result.errorMsg || '';
            const errorCode = result.Code || result.errorCode || '';
            const requestId = result.RequestId || '';
            var err: any = new Error(`code: ${res.statusCode}, ${errorMessage}, requestid: ${requestId}`);
            err.name = `${errorCode}Error`;
            err.statusCode = res.statusCode;
            err.result = result;
            err.code = errorCode;
            throw err;
        }
        return result;
    }

    private buildHeaders() {
        let defaultHeaders = {
            accept: 'application/json',
            date: new Date()["toGMTString"](),
            // host: this.host,
            'x-acs-signature-nonce': makeNonce(),
            'x-acs-signature-method': 'HMAC-SHA1',
            'x-acs-signature-version': '1.0',
            'x-acs-version': this.conf.apiVersion,
            'user-agent': DEFAULT_UA,
            'x-sdk-client': DEFAULT_CLIENT
        };
        if (this.conf.securityToken) {
            defaultHeaders['x-acs-accesskey-id'] = this.conf.accessKeyId;
            defaultHeaders['x-acs-security-token'] = this.conf.securityToken;
        }
        return defaultHeaders;
    }

    private buildAuthorization(stringToSign: string) {
        return `acs ${this.conf.accessKeyId}:${sig(this.conf.accessKeySecret, stringToSign)}`;
    }
}


function getCanonicalizedHeaders(headers) {
    const prefix = 'x-acs-';
    const keys = Object.keys(headers);

    const canonicalizedKeys = [];
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key.startsWith(prefix)) {
            canonicalizedKeys.push(key);
        }
    }

    canonicalizedKeys.sort();

    var result = '';
    for (let i = 0; i < canonicalizedKeys.length; i++) {
        const key = canonicalizedKeys[i];
        result += `${key}:${filter(headers[key]).trim()}\n`;
    }

    return result;
}

function getCanonicalizedResource(uriPattern, query) {
    const keys = Object.keys(query).sort();

    if (keys.length === 0) {
        return uriPattern;
    }

    var result = [];
    for (var i = 0; i < keys.length; i++) {
        const key = keys[i];
        result.push(`${key}=${query[key]}`);
    }

    return `${uriPattern}?${result.join('&')}`;
}

function buildStringToSign(method, uriPattern, headers, query) {
    const accept = headers['accept'];
    const contentMD5 = headers['content-md5'] || '';
    const contentType = headers['content-type'] || '';
    const date = headers['date'] || '';

    const header = `${method}\n${accept}\n${contentMD5}\n${contentType}\n${date}\n`;

    const canonicalizedHeaders = getCanonicalizedHeaders(headers);
    const canonicalizedResource = getCanonicalizedResource(uriPattern, query);

    return `${header}${canonicalizedHeaders}${canonicalizedResource}`;
}

function filter(value) {
    return value.replace(/[\t\n\r\f]/g, ' ');
}

function keyLowerify(headers) {
    const keys = Object.keys(headers);
    const newHeaders = {};
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        newHeaders[key.toLowerCase()] = headers[key];
    }
    return newHeaders;
}
