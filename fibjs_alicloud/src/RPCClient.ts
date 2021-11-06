import {DEFAULT_CLIENT, DEFAULT_UA, makeNonce, utc_timestamp, sig} from "./helper";
import * as http from "http";
import * as util from "util";

export class RPCClient {
    protected _codes: Array<string | number>;

    constructor(private conf: { accessKeyId: string, accessKeySecret: string, securityToken?: string, endpoint: string, apiVersion: string, codes?: Array<number | string> }) {
        this._codes = Array.isArray(conf.codes) && conf.codes.length > 0 ? conf.codes : ["OK", 200];
    }

    public invoke(action: string, params: any = {}, opts: any = {}) {
        // 1. compose params and opts
        let headers = {
            'x-sdk-client': DEFAULT_CLIENT,
            'user-agent': DEFAULT_UA,
            'x-acs-action': action,
            'x-acs-version': this.conf.apiVersion
        };
        if (opts.headers) {
            headers = {...headers, ...opts.headers}
        }

        // format action until formatAction is false
        if (opts.formatAction !== false) {
            action = firstLetterUpper(action);
        }

        // format params until formatParams is false
        if (opts.formatParams !== false) {
            params = formatParams(params);
        }
        var defaults = this._buildParams();
        params = Object.assign({Action: action}, defaults, params);

        // 2. caculate signature
        var method = (opts.method || 'GET').toUpperCase();
        var normalized = normalize(params);
        var canonicalized = canonicalize(normalized);
        // 2.1 get string to sign
        var stringToSign = `${method}&${encode('/')}&${encode(canonicalized)}`;
        // 2.2 get signature
        const key = this.conf.accessKeySecret + '&';

        var signature = sig(key, stringToSign);
        // add signature
        normalized.push(['Signature', encode(signature)]);
        // 3. generate final url
        const url = opts.method === 'POST' ? `${this.conf.endpoint}/` : `${this.conf.endpoint}/?${canonicalize(normalized)}`;
        // 4. send request

        opts.headers = headers;
        if (opts.method === 'POST') {
            opts.headers['content-type'] = 'application/x-www-form-urlencoded';
            opts.body = canonicalize(normalized);
        }

        let res = http.request(opts.method, url, util.pick(opts, "headers", "body"));
        let json = res.data;
        if (Buffer.isBuffer(json) && json[0] == 123 && json[json.length - 1] == 125) {
            json = JSON.parse(json.toString());
        }
        return {url: url, status: res.statusCode, data: json};
    }

    public request(action: string, params: any = {}, opts: any = {}) {
        let {data, url} = this.invoke(action, params, opts)
        if (data.Code && this._codes.includes(data.Code) == false) {
            var err: any = new Error(`${data.Message}, URL: ${url}`);
            err.name = data.Code + 'Error';
            err.data = data;
            err.code = data.Code;
            err.url = url;
            throw err;
        }
        return data;
    }

    private _buildParams() {
        var defaultParams: any = {
            Format: 'JSON',
            SignatureMethod: 'HMAC-SHA1',
            SignatureNonce: makeNonce(),
            SignatureVersion: '1.0',
            Timestamp: utc_timestamp(),
            AccessKeyId: this.conf.accessKeyId,
            Version: this.conf.apiVersion,
        };
        if (this.conf.securityToken) {
            defaultParams.SecurityToken = this.conf.securityToken;
        }
        return defaultParams;
    }
}


function encode(str) {
    var result = encodeURIComponent(str);

    return result.replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}

function replaceRepeatList(target, key, repeat) {
    for (var i = 0; i < repeat.length; i++) {
        var item = repeat[i];

        if (item && typeof item === 'object') {
            const keys = Object.keys(item);
            for (var j = 0; j < keys.length; j++) {
                target[`${key}.${i + 1}.${keys[j]}`] = item[keys[j]];
            }
        } else {
            target[`${key}.${i + 1}`] = item;
        }
    }
}

function flatParams(params) {
    var target = {};
    var keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = params[key];
        if (Array.isArray(value)) {
            replaceRepeatList(target, key, value);
        } else {
            target[key] = value;
        }
    }
    return target;
}

function normalize(params) {
    var list = [];
    var flated = flatParams(params);
    var keys = Object.keys(flated).sort();
    for (let i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = flated[key];
        list.push([encode(key), encode(value)]); //push []
    }
    return list;
}

function canonicalize(normalized) {
    var fields = [];
    for (var i = 0; i < normalized.length; i++) {
        var [key, value] = normalized[i];
        fields.push(key + '=' + value);
    }
    return fields.join('&');
}

function formatParams(params) {
    var keys = Object.keys(params);
    var newParams = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        newParams[firstLetterUpper(key)] = params[key];
    }
    return newParams;
}

function firstLetterUpper(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
}