import * as crypto from "crypto";
import * as http from "http";
import * as hash from "hash";
import * as uuid from "uuid";
import {objToXmlNoAttr, xmlToObjNoAttr} from "pf_xml";

/**
 * 微信支付
 */
export class Wx_pay {
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
 * 微信支付-现金红包
 * @see https://pay.weixin.qq.com/wiki/doc/api/tools/cash_coupon.php?chapter=13_1
 */
export class Wx_pay_hongbao extends Wx_pay {
    constructor(protected _cfg: { mch_id: string, appid: string, api_key: string, keyFile: string, certFile: string, hongbao_notify_url: string }) {
        super(_cfg);
    }

    /**
     * 发放红包
     * @param param
     * @see https://pay.weixin.qq.com/wiki/doc/api/tools/cash_coupon.php?chapter=13_4&index=3
     */
    public hbSend(param: { mch_billno: string, send_name: string, re_openid: string, total_amount: number, total_num?: number, wishing: string, act_name: string, remark: string, client_ip: string, scene_id?: string, risk_info?: string, nonce_str?: string }) {
        if (!Number.isInteger(param.total_num)) {
            param.total_num = 1;
        }
        if (!param.nonce_str) {
            param.nonce_str = uuid.random().toString("hex");
        }
        let data: any = {...param, mch_id: this._cfg.mch_id, wxappid: this._cfg.appid};
        data.sign = sortmd5_sign(data, this._cfg.api_key);
        let rsp = xml_post_send_retry_sysbusy("https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack", data, 9, 500);
        if (rsp.code != 0) {
            console.log("Wx_pay_hongbao_groupsend: %s %s %j %s %j", this._cfg.mch_id, this._cfg.appid, data, rsp.msg, rsp.data);
        }
        return rsp;
    }

    /**
     * 发放裂变红包
     * @param param
     * @see https://pay.weixin.qq.com/wiki/doc/api/tools/cash_coupon.php?chapter=13_5&index=4
     */
    public hbGroupSend(param: { mch_billno: string, send_name: string, re_openid: string, total_amount: number, total_num: number, amt_type?: string, wishing: string, act_name: string, remark: string, client_ip: string, scene_id?: string, risk_info?: string, nonce_str?: string }) {
        if (!Number.isInteger(param.total_num)) {
            param.total_num = 1;
        }
        if (!param.nonce_str) {
            param.nonce_str = uuid.random().toString("hex");
        }
        if (!param.amt_type) {
            param.amt_type = "ALL_RAND";
        }
        let data: any = {...param, mch_id: this._cfg.mch_id, wxappid: this._cfg.appid};
        data.sign = sortmd5_sign(data, this._cfg.api_key);
        let rsp = xml_post_send_retry_sysbusy("https://api.mch.weixin.qq.com/mmpaymkttransfers/sendgroupredpack", data, 9, 500);
        if (rsp.code != 0) {
            console.log("Wx_pay_hongbao_groupsend: %s %s %j %s %j", this._cfg.mch_id, this._cfg.appid, data, rsp.msg, rsp.data);
        }
        return rsp;
    }

    /**
     * 查询红包记录
     * @param param
     * @see https://pay.weixin.qq.com/wiki/doc/api/tools/cash_coupon.php?chapter=13_6&index=5
     */
    public hbInfo(param: { mch_billno: string, bill_type: string, nonce_str?: string }) {
        if (!param.nonce_str) {
            param.nonce_str = uuid.random().toString("hex");
        }
        let data: any = {...param, mch_id: this._cfg.mch_id, wxappid: this._cfg.appid};
        data.sign = sortmd5_sign(data, this._cfg.api_key);
        return xml_post_send_retry_sysbusy("https://api.mch.weixin.qq.com/mmpaymkttransfers/gethbinfo", data, 1, 1000);
    }
}

/**
 * 微信支付-企业付款给个人钱包
 * @see https://pay.weixin.qq.com/wiki/doc/api/tools/mch_pay.php?chapter=14_1
 */
export class Wx_pay2wallet extends Wx_pay {
    constructor(protected _cfg: { mch_id: string, api_key: string, appid: string, keyFile: string, certFile: string }) {
        super(_cfg);
    }

    /**
     * 付款给个人
     * @param order {partner_trade_no:"商户订单号", amount:"金额",desc:"付款备注"}
     */
    public transferTo(order: { partner_trade_no: string, openid: string, amount: number, desc: string, nonce_str?: string, device_info?: string, spbill_create_ip?: string, check_name?: string, re_user_name?: string }) {
        let data: any = {mchid: this._cfg.mch_id, mch_appid: this._cfg.appid, ...order};
        if (!data.nonce_str) {
            data.nonce_str = uuid.random().toString("hex");
        }
        if (!data.check_name) {
            data.check_name = "NO_CHECK";
        }
        for (let k in data) {
            if (!data[k]) {
                delete data[k];
            }
        }
        data.sign = sortmd5_sign(data, this._cfg.api_key);
        let rsp = xml_post_send_retry_sysbusy("https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers", data, 9, 500);
        if (rsp.code != 0) {
            console.log("Wx_pay2wallet_to: %s %s %j %s %j", this._cfg.mch_id, this._cfg.appid, data, rsp.msg, rsp.data);
        }
        return rsp;
    }

    /**
     * 查询付款信息
     * @see https://pay.weixin.qq.com/wiki/doc/api/tools/mch_pay.php?chapter=14_3
     */
    public transferInfo(order: { partner_trade_no: string, nonce_str?: string }) {
        let data: any = {
            mch_id: this._cfg.mch_id,
            appid: this._cfg.appid,
            partner_trade_no: order.partner_trade_no,
            nonce_str: order.nonce_str || uuid.random().toString("hex")
        };
        data.sign = sortmd5_sign(data, this._cfg.api_key);
        return xml_post_send_retry_sysbusy("https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo", data, 1, 1000);
    }
}

function xml_post_send_retry_sysbusy(url: string, jsonData: any, retryNum = 9, retryTtl = 500) {
    let xml = objToXmlNoAttr(jsonData);
    let rsp = this._client.post("https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo", {
        body: xml,
        headers: {"Content-Type": "text/xml"}
    });
    if (rsp.statusCode != 200) {
        return {code: 500, msg: "sys_err:" + rsp.statusCode + "," + rsp.statusMessage, data: {}};
    }
    let body = xmlToObjNoAttr(rsp.data.toString());
    if (body.return_code != "SUCCESS") {
        return {code: 500, msg: body.return_msg, data: body};
    }
    if (body.result_code != "SUCCESS") {
        if (body.err_code == "SYSTEMERROR") {
            if (retryNum > 0) {
                require("coroutine").sleep(retryTtl);
                return xml_post_send_retry_sysbusy(url, jsonData, retryNum - 1, Math.ceil(retryTtl * 1.2));
            }
        }
        return {code: 500, msg: body.err_code + ";" + body.err_code_des, data: body};
    }
    return {code: 0, msg: body.result_code, data: body};
}

/**
 * 参数签名v2
 * @param params
 * @param api_secret
 * @returns string 签名字符串
 */
function sortmd5_sign(params: { [index: string]: any }, api_secret: string) {
    let str = Object.keys(params).sort().reduce((arr, k) => {
        let v = params[k];
        if (v !== undefined && v !== null && v !== "") {
            arr.push(`${k}=${v}`);
        }
        return arr;
    }, []).join("&") + `&key=${api_secret}`;
    // console.log(str)
    return hash.md5(<any>str).digest("hex");//.toUpperCase();
}