import * as http from "http";
import * as hash from "hash";
import * as coroutine from "coroutine";
import {AES, CBC, Cipher, NOPADDING} from "crypto";
import {Multipart} from "fibjs-multipart";
import {getCacheHandler} from "./_util";

/**
 * 微信小游戏相关接口
 */

/**
 * 微信小游戏-帐号授权（接口调用凭证 和 帐号登录相关）
 */
export class auth {
    private appid: string;
    private secret: string;

    constructor(cfg: { appid: string, secret: string }) {
        this.appid = cfg.appid;
        this.secret = cfg.secret;
    }

    /**
     * 登录凭证校验，获取帐号openid等信息
     * @param code
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/login/auth.code2Session.html
     */
    public code2Session(code: string): { openid: string, session_key: string, unionid?: string } {
        let appid = this.appid, secret = this.secret;
        let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
        let res = http.get(url);
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.openid) {
                return body;
            }
            throw new Error(`jscode2session:${this.appid}:${body.errcode}_${body.errmsg}`);
        } else {
            throw new Error(`jscode2session:${this.appid}:${res.statusCode}:io_err`);
        }
        return null;
    }

    /**
     * 校验服务器所保存的登录态 session_key 是否有效
     * @param openid
     * @param session_key
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/login/auth.checkSessionKey.html
     */
    public checkSessionKey(openid: string, session_key: string): boolean {
        let access_token = this.getAccessToken();
        let signature = crypto_util.hmac_sha256(session_key, "");
        let url = `https://api.weixin.qq.com/wxa/checksession?access_token=${access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        let res = http.get(url);
        if (res.statusCode == 200) {
            return res.json().errcode == 0;
        } else {
            return false;
        }
    }

    /**
     * 获取小程序全局唯一后台接口调用凭据（access_token）
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/access-token/auth.getAccessToken.html
     */
    public getAccessToken(): string {
        let cache_key = `access_token:wxmini:${this.appid}`;
        let cache_obj = getCacheHandler();
        let cache_accessToken = cache_obj.get(cache_key);
        if (cache_accessToken) {
            return cache_accessToken;
        }
        let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appid}&secret=${this.secret}`;
        let res = http.get(url);
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.errcode) {
                throw new Error(`access_token:${this.appid}:${body.errcode}_${body.errmsg}`);
            }
            let access_token = body.access_token;
            //这里缓存时间设置为 最大3分钟，用于外网内网都能用【一个新token产生后旧的还5分钟有效期】
            let expires_in = Math.max(180, Math.ceil(body.expires_in * 0.95));
            try {
                cache_obj.set(cache_key, access_token, expires_in);
            } catch (e) {
            }
            return access_token;
        }
        throw new Error(`access_token:${this.appid}:${res.statusCode}:io_err`);
    }
}

/**
 * 微信小游戏-内容安全相关接口（检测违规图片文字等）
 */
export class security {
    constructor(private access_token: string) {
    }

    /**
     * 校验一张图片是否含有违法违规内容。
     * @param fileOrContent
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/sec-check/security.imgSecCheck.html
     */
    public img_check(fileOrContent: string | Class_Buffer): wx_base_api_res {
        let url = `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${this.access_token}`;
        let multipart = new Multipart();
        if (Buffer.isBuffer(fileOrContent)) {
            multipart.fileData("media", <Class_Buffer>fileOrContent, "/tmp/media.jpg");
        } else {
            multipart.file("media", <string>fileOrContent);
        }
        let res = multipart.post(url);
        if (res.statusCode == 200) {
            return res.json();
        }
        return {errcode: -2, errmsg: "io_err_" + res.statusCode};
    }

    /**
     * 文本内容检测-新。注意限制频率
     * @param content
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/sec-check/security.msgSecCheck.html
     */
    public text_check_v1(content: string): wx_base_api_res {
        let url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${this.access_token}`;
        return http_post_json(url, {content: content});
    }

    /**
     * 文本内容检测-新。注意限制频率
     * @param content
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/sec-check/security.msgSecCheck.html
     */
    public text_check(openid: string, content: string, ctx: { version: string, scene: number, nickname?: string, title?: string, signature?: string } = {
        version: "2",
        scene: 2
    }): security_text_sec_res {
        let url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${this.access_token}`;
        let body = {...ctx, openid: openid, content: content};
        return http_post_json(url, body);
    }

    /**
     * 异步校验图片/音频是否含有违法违规内容。
     * @param media_url
     * @param media_type
     */
    public media_check_v1(media_url: string, media_type: number): { errcode: number, errmsg: string, trace_id?: string } {
        let url = `https://api.weixin.qq.com/wxa/media_check_async?access_token=${this.access_token}`;
        return http_post_json(url, {media_url: media_url, media_type: media_type});
    }

    /**
     * 异步校验图片/音频是否含有违法违规内容。
     * @param media_url
     * @param media_type
     */
    public media_check(openid: string, media_url: string, media_type: number, ctx: { version: number, scene: number } = {
        version: 2,
        scene: 2
    }): { errcode: number, errmsg: string, trace_id?: string } {
        let url = `https://api.weixin.qq.com/wxa/media_check_async?access_token=${this.access_token}`;
        return http_post_json(url, {...ctx, media_url: media_url, media_type: media_type});
    }
}

/**
 * 文本审核结果数据格式
 */
export interface security_text_sec_res {
    errcode: number,
    errmsg: string,
    trace_id?: string,
    result?: { suggust: "risky" | "pass" | "review", label: number },
    detail?: Array<{ strategy: string, errcode: number, suggest: "risky" | "pass" | "review", label: number, prob: number, keyword: string }>
}

/**
 * 微信默认接口响应值
 */
export interface wx_base_api_res {
    errcode: number,
    errmsg: string
}

export class crypto_util {
    public static decodeUserJsonData(sessionKey: string, encryptedData: string, ivStr: string, appId?: string) {
        // base64 decode
        let key = new Buffer(sessionKey, 'base64')
        let data = new Buffer(encryptedData, 'base64')
        let iv = new Buffer(ivStr, 'base64')

        let decipher = new Cipher(AES, CBC, key, iv);
        // 设置自动 padding 为 true，删除填充补位
        // decipher.paddingMode(NOPADDING);
        let descryptData = decipher.decrypt(data);
        if (!descryptData) {
            throw new Error('Decrypt Illegal Buffer DecryptErr');
        }
        let decoded: any;
        try {
            decoded = JSON.parse(descryptData.toString('utf8'));
        } catch (e) {
            throw new Error('Illegal Buffer JsonErr');
        }
        if (appId && decoded.watermark && decoded.watermark.appid !== appId) {
            throw new Error('Illegal Buffer BadAppId');
        }
        return decoded;
    }

    /**
     * hmac_sha256算法签名
     * @param key
     * @param val
     */
    public static hmac_sha256(key: string, val: string): string {
        return hash.hmac_sha256(<any>key, <any>val).digest("hex");
    }
}

/**
 * 微信小程序订阅相关
 */
export class subscribeMessage {
    constructor(private access_token: string) {
    }

    /**
     * 发送订阅消息（用户在小程序/小游戏主动订阅之后）
     * @param params
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/subscribe-message/subscribeMessage.send.html
     */
    public send(params: { touser: string, template_id: string, data: { [index: string]: { value: string } } | any, page?: string, miniprogram_state?: string, lang?: string }): wx_base_api_res {
        let url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${this.access_token}`;
        return http_post_json(url, params);
    }
}

export interface wx_ClientInfo {
    openid: string,
    session_key: string,
    zone_id?: string | number,
    user_ip?: string,
    pf?: string
}

/**
 * 虚拟支付-米大师
 */
export class virtualPay {
    private base_url: string;

    constructor(private access_token: string, private cfg: { appid: string, offer_id: string, offer_secret: string, sandbox?: boolean }) {
        this.base_url = cfg.sandbox ? `https://api.weixin.qq.com/cgi-bin/midas/sandbox` : `https://api.weixin.qq.com/cgi-bin/midas`;
    }

    /**
     * 查询虚拟支付索要单。开发者可以通过查询接口主动查询索要单信息和状态，完成下一步的业务逻辑
     * @param order_no
     * @param out_trade_no
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/midas-payment/business.getPayForOrder.html
     */
    public getPayForOrder(order_no: string, out_trade_no: string): wx_base_api_res | (wx_base_api_res & { payfororder: { out_trade_no: string, order_no: string, openid: string, create_time: number, amount: number, status: number, zone_id: number, env: number, pay_time: number } }) {
        let url = `https://api.weixin.qq.com/wxa/business/getpayfororder?access_token=${this.access_token}`;
        let body = {order_no: order_no, out_trade_no: out_trade_no, appid: this.cfg.appid};
        return http_post_json(url, body);
    }

    /**
     * 获取游戏币余额。开通了虚拟支付的小游戏，可以通过本接口查看某个用户的游戏币余额
     * @param clientInfo
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/midas-payment/midas.getBalance.html
     */
    public getBalance(clientInfo: wx_ClientInfo): {
        errcode: number, errmsg: string,
        balance: number, /** 游戏币个数（包含赠送） */
        gen_balance: number, /** 赠送游戏币数量（赠送游戏币数量） */
        first_save: boolean, /** 是否满足历史首次充值 */
        save_amt: number, /** 累计充值金额的游戏币数量 */
        save_sum: number, /**  历史总游戏币金额 */
        cost_sum: number, /** 历史总消费游戏币金额 */
        present_sum: number /** 历史累计收到赠送金额 */
    } {
        let url = `${this.base_url}/getbalance?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            offer_id: this.cfg.offer_id,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android"
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params);
    }

    /**
     * 扣除游戏币。开通了虚拟支付的小游戏，可以通过本接口扣除某个用户的游戏币
     * @param clientInfo
     * @param order
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/midas-payment/midas.pay.html
     */
    public pay(clientInfo: wx_ClientInfo, order: { bill_no: string, amt: number, pay_item?: string, app_remark?: string }): {
        errcode: number, errmsg: string,
        bill_no: string, //订单号，有效期是 48 小时
        balance: number, //预扣后的余额
        used_gen_amt: number //本次扣的赠送币的金额
    } {
        let url = `${this.base_url}/pay?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            offer_id: this.cfg.offer_id,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android",
            amt: order.amt,
            bill_no: order.bill_no,
        }
        if (order.pay_item && order.pay_item.length > 0) params.pay_item = order.pay_item;
        if (order.app_remark && order.app_remark.length > 0) params.app_remark = order.app_remark;
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params, 0);
    }

    /**
     * 取消订单。开通了虚拟支付的小游戏，若扣除游戏币的订单号在有效时间内，可以通过本接口取消该笔扣除游戏币的订单
     * @param clientInfo
     * @param bill_no  取消的订单号
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/midas-payment/midas.cancelPay.html
     */
    public cancelPay(clientInfo: wx_ClientInfo, bill_no: string): { errcode: number, errmsg: string, bill_no: string } {
        let url = `${this.base_url}/cancelpay?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            offer_id: this.cfg.offer_id,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android",
            bill_no: bill_no
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params);
    }

    /**
     * 给用户赠送游戏币。开通了虚拟支付的小游戏，可以通过该接口赠送游戏币给某个用户。
     * @param clientInfo
     * @param order
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/midas-payment/midas.present.html
     */
    public present(clientInfo: wx_ClientInfo, order: { bill_no: string, present_counts: number }): { errcode: number, errmsg: string, bill_no: string, balance: number } {
        let url = `${this.base_url}/present?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            offer_id: this.cfg.offer_id,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android",
            bill_no: order.bill_no,
            present_counts: order.present_counts
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params, 0);
    }

    private post_pay(session_key: string, url: string, params: any, retry: number = 1) {
        let path = url.substring(url.indexOf('/', 9), url.lastIndexOf('?'));
        params = this.fixSig(path, params, session_key);
        return http_post_json(url, params, retry);
    }

    private fixSig(cgi_path: string, params: { [index: string]: any }, session_key: string) {
        params.sig = this.make_mds_sig(params, cgi_path, this.cfg.offer_secret);
        params.access_token = this.access_token;
        params.mp_sig = this.make_mp_sig(params, cgi_path, session_key);
        delete params.access_token;
        return params;
    }

    private make_mp_sig(params: { [index: string]: any }, cgi_path: string, session_key: string) {//微信平台签名
        let kvs = [];
        Object.keys(params).sort().forEach(k => kvs.push(k + '=' + params[k]));
        return crypto_util.hmac_sha256(session_key, `${kvs.join("&")}&org_loc=${cgi_path}&method=POST&session_key=${session_key}`);
    }

    private make_mds_sig(params: { [index: string]: any }, cgi_path: string, secret: string) {//米大师签名
        let kvs = [];
        Object.keys(params).sort().forEach(k => kvs.push(k + '=' + params[k]));
        return crypto_util.hmac_sha256(secret, `${kvs.join("&")}&org_loc=${cgi_path}&method=POST&secret=${secret}`);
    }
}

/**
 * 微信小程序/小游戏-开放数据域
 */
export class storage {
    constructor(private access_token: string) {
    }

    /**
     * 删除已经上报到微信的key-value数据
     * @param openid
     * @param session_key
     * @param keys
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/data/storage.removeUserStorage.html
     */
    public removeUserStorage(openid: string, session_key: string, keys: Array<string>): wx_base_api_res {
        let params = {key: keys};
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://api.weixin.qq.com/wxa/remove_user_storage?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params, 1);
    }

    /**
     * 上报用户数据后台接口。小游戏可以通过本接口上报key-value数据到用户的CloudStorage
     * @param openid
     * @param session_key
     * @param kv_list
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/data/storage.setUserStorage.html
     */
    public setUserStorage(openid: string, session_key: string, kv_list: Array<{ key: string, value: string }>) {
        let params = {kv_list: kv_list};
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://api.weixin.qq.com/wxa/set_user_storage?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params, 1);
    }

    /**
     * 写用户关系链互动数据存储
     * @param openid
     * @param session_key
     * @param kv_list
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/data/storage.setUserInteractiveData.html
     */
    public setUserInteractiveData(openid: string, session_key: string, kv_list: Array<{ key: string, value: number }>) {
        let params = {kv_list: kv_list};
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://api.weixin.qq.com/wxa/setuserinteractivedata?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params, 1);
    }
}

/**
 * URL Scheme
 */
export class urlscheme {
    constructor(private access_token: string) {
    }

    /**
     * 获取小程序 scheme 码，适用于短信、邮件、外部网页、微信内等拉起小程序的业务场景。通过该接口，可以选择生成到期失效和永久有效的小程序码，目前仅针对国内非个人主体的小程序开放
     * @param params
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/url-scheme/urlscheme.generate.html
     */
    public generateScheme(params: { jump_wxa?: { path?: string, query?: string }, is_expire?: boolean, expire_type?: number, expire_time?: number, expire_interval?: number }): {
        errcode: number, errmsg: string, openlink?: string
    } {
        let url = `https://api.weixin.qq.com/wxa/generatescheme?access_token=${this.access_token}`;
        return http_post_json(url, params);
    }
}

/**
 * 安全风控
 */
export class riskControl {
    constructor(private access_token: string, private appid: string) {
    }

    /**
     * 根据提交的用户信息数据获取用户的安全等级 risk_rank，无需用户授权
     * @param params
     * @see https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/safety-control-capability/riskControl.getUserRiskRank.html
     */
    public getUserriskRank(params: { openid: string, scene: number, client_ip: string, mobile_no?: string, email_address?: string, extended_info?: string, bank_card_no?: string, is_test?: boolean }): {
        errcode: number, errmsg: string, unoin_id?: number, risk_rank?: number
    } {
        (<any>params)["appid"] = this.appid;
        let url = `https://api.weixin.qq.com/wxa/getuserriskrank?access_token=${this.access_token}`;
        return http_post_json(url, params);
    }
}

function http_post_json(url: string, jsonParams: any, retry: number = 0) {
    let res: Class_HttpResponse;
    try {
        res = http.post(url, {json: jsonParams});
    } catch (e) {
        return {errcode: -500, errmsg: "io_err"};
    }
    if (res.statusCode != 200) {
        return {errcode: -500, errmsg: "io_err_" + res.statusCode};
    }
    let json = res.json();
    if (json.errcode == -1 && retry > 0) {
        coroutine.sleep(Math.floor(20 + Math.random() * 200));
        return http_post_json(url, jsonParams, retry - 1);
    }
    return json;
}