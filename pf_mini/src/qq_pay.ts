import * as crypto from "crypto";
import * as http from "http";
import * as hash from "hash";
import * as uuid from "uuid";

/**
 * qq钱包-一些接口
 * @see https://mp.qpay.tenpay.com/buss/doc.shtml
 */

export class Qq_pay {
    protected _client: Class_HttpClient;

    /**
     * 构造函数
     * @param _cfg 配置
     */
    constructor(protected _cfg: { mch_id: string, api_key: string, keyFile: string, certFile: string }) {
        this._client = new http.Client();
        this._client.setClientCert(crypto.loadCert(_cfg.certFile), crypto.loadPKey(_cfg.keyFile));
    }
}

/**
 * QQ钱包-现金红包功能接口
 * @see https://mp.qpay.tenpay.com/buss/wiki/221/1219
 */
export class Qq_pay_hongbao extends Qq_pay {
    constructor(protected _cfg: { mch_id: string, appid: string, api_key: string, keyFile: string, certFile: string, hongbao_notify_url: string }) {
        super(_cfg);
    }

    /**
     * 发红包
     * @param param
     * @see https://mp.qpay.tenpay.com/buss/wiki/221/1220
     */
    public hbSend(param: { mch_billno: string, mch_name: string, re_openid: string, total_amount: number, total_num?: number, min_value?: number, max_value?: number, wishing: string, act_name: string, icon_id: number, banner_id?: number, not_send_msg?: number, nonce_str?: string, notify_url?: string }) {
        let args = {
            mch_id: this._cfg.mch_id,
            charset: 1,
            nonce_str: param.nonce_str ? param.nonce_str : uuid.random().toString("hex"),
            mch_billno: param.mch_billno,
            mch_name: param.mch_name,
            qqappid: this._cfg.appid,
            re_openid: param.re_openid,
            total_amount: param.total_amount,
            total_num: param.total_num > 0 ? param.total_num : 1,
            min_value: param.min_value > 0 ? param.min_value : param.total_amount,
            max_value: param.max_value > 0 ? param.max_value : param.total_amount,
            wishing: param.wishing,
            act_name: param.act_name,
            icon_id: param.icon_id,
            banner_id: param.banner_id,
            notify_url: param.notify_url || this._cfg.hongbao_notify_url,
            not_send_msg: param.not_send_msg >= 0 ? param.not_send_msg : 0,
        };

        args["sign"] = sortmd5_sign(args, this._cfg.api_key);
        let rsp = this._client.post("https://api.qpay.qq.com/cgi-bin/hongbao/qpay_hb_mch_send.cgi", {body: args});
        if (rsp.statusCode != 200) {
            console.warn("Qq_pay_hongbao_send: %s %s %j %d %s", this._cfg.mch_id, this._cfg.appid, args, rsp.statusCode, rsp.statusMessage);
            return {code: 500, msg: "sys_err:" + rsp.statusMessage};
        }
        let body = Buffer.isBuffer(rsp.data) ? JSON.parse(rsp.data.toString()) : rsp.data;
        console.log("qqpay_hongbao_send: %s %s %j %j", this._cfg.mch_id, this._cfg.appid, args, body);
        return {code: Number(body.retcode), msg: body.retmsg, listid: String(body.listid), data: body};
    }

    /**
     * 查询-红包详情
     * @see https://qpay.qq.com/cgi-bin/mch_query/qpay_hb_mch_list_query.cgi
     */
    public hbInfo(param: { listid: string, mch_billno?: string, sub_mch_id?: string, nonce_str?: string }) {
        let args = {
            ...param,
            mch_id: this._cfg.mch_id,
            charset: 1,
            nonce_str: param.nonce_str ? param.nonce_str : uuid.random().toString("hex"),
        };
        args["sign"] = sortmd5_sign(args, this._cfg.api_key);
        let rsp = this._client.post("https://qpay.qq.com/cgi-bin/mch_query/qpay_hb_mch_list_query.cgi", {body: args});
        if (rsp.statusCode != 200) {
            // console.warn("Qq_pay_hongbao_info: %s %s %j %d %s", this._cfg.mch_id, this._cfg.qqappid, args, rsp.statusCode, rsp.statusMessage);
            return {code: 500, msg: "sys_err:" + rsp.statusMessage};
        }
        let body = Buffer.isBuffer(rsp.data) ? JSON.parse(rsp.data.toString()) : rsp.data;
        // console.log("Qq_pay_hongbao_info: %s %s %j %j", this._cfg.mch_id, this._cfg.qqappid, args, body);
        return {
            code: Number(body.retcode),
            msg: body.retmsg,
            listid: String(body.listid),
            state: Number(body.state),
            data: body
        };
    }

    /**
     * 检测回调参数和签名
     * @param body xml解析后的js对象
     */
    public verifyNotifyBack(body: { [index: string]: any }): { success: boolean, xml: string } {
        let fields = ["mch_id", "appid", "openid", "out_trade_no", "sign", "sign_type", "state", "time_end", "total_fee", "transaction_id"];
        if (body == null || fields.some(f => body.hasOwnProperty(f) == false)) {
            return {
                success: false,
                xml: "<xml><return_code>FAIL</return_code><return_msg><![CDATA[参数格式校验错误]]></return_msg></xml>"
            };
        }
        let sign_fail = body.sign_type != "MD5" || body.mch_id != this._cfg.mch_id;
        if (!sign_fail) {
            let params = {...body};
            delete params.sign;
            // console.warn(QPayApi.sign(params, sys.config("qpay").api_key), sign);
            sign_fail = sortmd5_sign(params, this._cfg.api_key) != body.sign;
        }
        if (sign_fail) {
            return {
                success: false,
                xml: "<xml><return_code>FAIL</return_code><return_msg><![CDATA[签名失败]]></return_msg></xml>"
            };
        }
        return {success: true, xml: "<xml><return_code>SUCCESS</return_code><return_msg>OK</return_msg></xml>"};
    }
}

/**
 * 参数签名
 * @param params
 * @param api_secret
 * @returns string 签名字符串
 */
function sortmd5_sign(params: { [index: string]: any }, api_secret: string) {
    for (let k in params) {
        if (params[k] === undefined) {
            delete params[k];
        }
    }
    let str = Object.keys(params).sort().reduce((arr, k) => {
        let v = params[k];
        if (v !== undefined && v !== null && v !== "") {
            arr.push(`${k}=${v}`);
        }
        return arr;
    }, []).join("&") + `&key=${api_secret}`;
    // console.log(str)
    return hash.md5(<any>str).digest("hex").toUpperCase();
}