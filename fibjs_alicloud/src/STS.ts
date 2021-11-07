
import * as http from "http";
import * as crypto from "crypto";

/**
 * 阿里云STS（Security Token Service）是阿里云提供的一种临时访问权限管理服务
 * @see https://help.aliyun.com/document_detail/28756.html
 */
export class STS{
    private options:{endpoint:string, format:string, apiVersion:string, sigMethod:string, sigVersion:string,
        accessKeyId:string, accessKeySecret:string
    };
    constructor(options:{accessKeyId:string, accessKeySecret:string, endpoint?:string, format?:string, apiVersion?:string, sigMethod?:string, sigVersion?:string}) {
        if (!options
            || !options.accessKeyId
            || !options.accessKeySecret) {
            throw new Error('require accessKeyId, accessKeySecret');
        }

        this.options = {...{
                endpoint: options.endpoint || 'https://sts.aliyuncs.com',
                format: 'JSON',
                apiVersion: '2015-04-01',
                sigMethod: 'HMAC-SHA1',
                sigVersion: '1.0'
            }, ...options};

    }
    public assumeRole(role:string, policy:{[index:string]:any}=null, expiration:number=3600, session:string="app") {
        const opts = this.options;
        const params:any = {
            Action: 'AssumeRole',
            RoleArn: role,
            RoleSessionName: session,
            DurationSeconds: expiration,

            Format: opts.format,
            Version: opts.apiVersion,
            AccessKeyId: opts.accessKeyId,
            SignatureMethod: opts.sigMethod,
            SignatureVersion: opts.sigVersion,
            SignatureNonce: Math.random(),
            Timestamp: new Date().toISOString()
        };

        if (policy) {
            params.Policy = JSON.stringify(policy);
        }

        params.Signature = _stsSignature('POST', params, opts.accessKeySecret);

        let rsp = http.post(opts.endpoint, {body:params});
        if (Math.floor(rsp.statusCode / 100) !== 2) {
            const err:any = new Error();
            err.status = rsp.statusCode;
            try {
                const resp = rsp.data || {};
                err.code = resp.Code;
                err.message = `${resp.Code}: ${resp.Message}`;
                err.requestId = resp.RequestId;
            } catch (e) {
                err.message = `UnknownError: ${JSON.stringify(rsp.data)}`;
            }
            throw err;
        }
        return {
            statusCode: rsp.statusCode,
            credentials: rsp.data.Credentials
        };
    }
}

function _stsSignature(method:string, params, key:string) {
    const canoQuery = Object.keys(params).sort().map(k => `${_escape(k)}=${_escape(params[k])}`).join('&');
    const stringToSign =
        `${method.toUpperCase()
        }&${this._escape('/')
        }&${this._escape(canoQuery)}`;
    return crypto.createHmac('sha1', <any>`${key}&`).update(<any>stringToSign).digest('base64');
}

/**
 * Since `encodeURIComponent` doesn't encode '*', which causes
 * 'SignatureDoesNotMatch'. We need do it ourselves.
 */
function _escape(str) {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}
