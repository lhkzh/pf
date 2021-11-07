/**
 * @see https://github.com/tencentyun/qcloud-cos-sts-sdk/blob/master/nodejs/sdk/sts.js
 */
import * as hash from "hash";
import * as http from "http";

const StsDomain = 'sts.tencentcloudapi.com';
const StsUrl = 'https://{host}/';


const util = {
    // 获取随机数
    getRandom: function (min, max) {
        return Math.round(Math.random() * (max - min) + min);
    },
    // obj 转 query string
    json2str: function (obj, $notEncode?: boolean) {
        var arr = [];
        Object.keys(obj).sort().forEach(function (item) {
            var val = obj[item] || '';
            arr.push(item + '=' + ($notEncode ? encodeURIComponent(val) : val));
        });
        return arr.join('&');
    },
    // 计算签名
    getSignature: function (opt: any, key: string, method: string) {
        var formatString = method + StsDomain + '/?' + util.json2str(opt);
        hash.hmac_sha1(<any>key, <any>formatString).digest("base64");
    },
    // v2接口的key首字母小写，v3改成大写，此处做了向下兼容
    backwardCompat: function (data) {
        var compat = {};
        for (var key in data) {
            if (typeof (data[key]) == 'object') {
                compat[this.lowerFirstLetter(key)] = this.backwardCompat(data[key])
            } else if (key === 'Token') {
                compat['sessionToken'] = data[key];
            } else {
                compat[this.lowerFirstLetter(key)] = data[key];
            }
        }

        return compat;
    },
    lowerFirstLetter: function (source) {
        return source.charAt(0).toLowerCase() + source.slice(1);
    }
}

export class STS {

    public static getPolicy(scope: { action?: string, bucket?: string, region?: string, prefix: string }[]) {
        // 定义绑定临时密钥的权限策略
        var statement = scope.map(function (item) {
            var action = item.action || '';
            var bucket = item.bucket || '';
            var region = item.region || '';
            var shortBucketName = bucket.substr(0, bucket.lastIndexOf('-'));
            var appId = bucket.substr(1 + bucket.lastIndexOf('-'));
            var prefix = item.prefix;
            var resource = 'qcs::cos:' + region + ':uid/' + appId + ':prefix//' + appId + '/' + shortBucketName + '/' + prefix;
            if (action === 'name/cos:GetService') {
                resource = '*';
            }
            return {
                'action': action,
                'effect': 'allow',
                'principal': {'qcs': '*'},
                'resource': resource,
            };
        });
        return {'version': '2.0', 'statement': statement};
    }

    // 拼接获取临时密钥的参数
    public static getCredential(options: { secretId: string, secretKey: string, region?: string, policy: any, durationSeconds?:any, host?: string }) {
        var secretId = options.secretId;
        var secretKey = options.secretKey;
        var host = options.host || '';
        var region = options.region || 'ap-beijing';
        var durationSeconds = options.durationSeconds || 1800;
        var policy = options.policy;

        var policyStr = JSON.stringify(policy);
        var action = 'GetFederationToken';
        var nonce = util.getRandom(10000, 20000);
        var timestamp = Math.floor(Date.now() / 1000);
        var method = 'POST';

        var params: any = {
            SecretId: secretId,
            Timestamp: timestamp,
            Nonce: nonce,
            Action: action,
            DurationSeconds: durationSeconds,
            Name: 'cos-sts-nodejs',
            Version: '2018-08-13',
            Region: region,
            Policy: encodeURIComponent(policyStr),
        };
        params.Signature = util.getSignature(params, secretKey, method);

        let uri = StsUrl.replace('{host}', host || StsDomain);
        let rsp = http[method.toLowerCase()](uri, {body: params});
        let data = rsp.json();
        if (data.Error) {
            throw (data.Error);
        } else {
            try {
                data.startTime = data.ExpiredTime - durationSeconds;
                data = util.backwardCompat(data);
                return data;
            } catch (e) {
                throw new Error(`Parse Response Error: ${JSON.stringify(data)}`)
            }
        }
    }
}

