import * as http from "http";
import * as hash from "hash";
import * as coroutine from "coroutine";
import { getCacheHandler } from "./_util";
import * as querystring from "querystring";
import { crypto_util } from "./wx_mini";

/**
 * 头条小游戏-帐号授权（接口调用凭证 和 帐号登录相关）
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
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/server/log-in/code-2-session
     */
    public code2Session(params: { code?: string, anonymous_code?: string }): { errcode: number, errmsg?: string, anonymous_openid?: string, openid?: string, session_key?: string, unionid?: string } {
        for (var k in params) {
            if (!params[k] || params[k] == "" || params[k] == "undefiend" || params[k] == "null") {
                delete params[k];
            }
        }
        let url = `https://minigame.zijieapi.com/mgplatform/api/apps/jscode2session?appid=${this.appid}&secret=${this.secret}&${querystring.stringify(params)}`;
        let res = http.get(url);
        if (res.statusCode == 200) {
            let body = http_format_rsp(res.json());
            if (body.openid || body.anonymous_openid) {
                return body;
            }
            throw new Error(`jscode2session:${this.appid}:${body.errcode}_${body.errmsg}`);
        } else {
            throw new Error(`jscode2session:${this.appid}:${res.statusCode}:io_err`);
        }
    }

    /**
     * 获取小游戏全局唯一后台接口调用凭据（access_token）
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/server/interface-request-credential/get-access-token
     */
    public getAccessToken(): string {
        let cache_key = `access_token:ttmini:${this.appid}`;
        let cache_obj = getCacheHandler();
        let cache_accessToken = cache_obj.get(cache_key);
        if (cache_accessToken) {
            return cache_accessToken;
        }
        let url = `https://minigame.zijieapi.com/mgplatform/api/apps/token?grant_type=client_credential&appid=${this.appid}&secret=${this.secret}`;
        let res = http.get(url);
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.errcode != 0) {
                throw new Error(`access_token:${this.appid}:${body.errcode}_${body.errmsg}`);
            }
            let access_token = body.access_token;
            //这里缓存时间设置为 最大5分钟，用于外网内网都能用【一个新token产生后旧的还5分钟有效期】
            let expires_in = Math.min(300, Math.ceil(body.expires_in * 0.95));
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
 * 小游戏-开放数据域
 */
export class storage {
    constructor(private access_token: string) {
    }

    /**
     * 以 key-value 形式存储用户数据到小程序平台的云存储服务
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/server/data-caching/set-user-storage
     */
    public setUserStorage(openid: string, session_key: string, kv_list: Array<{ key: string, value: string }>): { errcode: number, errmsg: string } {
        let params = { kv_list: kv_list };
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://minigame.zijieapi.com/mgplatform/api/apps/set_user_storage?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params);
    }

    /**
     * 删除存储到字节跳动的云存储服务的 key-value 数据
     */
    public removeUserStorage(openid: string, session_key: string, key: Array<string>): { errcode: number, errmsg: string } {
        let params = { key: key };
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://minigame.zijieapi.com/mgplatform/api/apps/remove_user_storage?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, { json: params });
    }
}

/**
 * 分享用URL Link
 */
export class urlLink {
    constructor(protected appid: string, private access_token: string) {
    }

    /**
     * 生成能够直接跳转到端内小程序的 url link
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/share/url-link-generate 
     */
    public generate(params: { app_name: string, path?: string, query?: string, expire_time?: number }): { errcode: number, errmsg: string, url_link: string } {
        let url = `https://developer.toutiao.com/api/apps/url_link/generate`;
        return http_post_json(url, { access_token: this.access_token, ma_app_id: this.appid, ...params });
    }

    /**
     * 查询已经生成的 link 的信息
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/share/url-link-query
     */
    public query_info(url_link: string): { errcode: number, errmsg: string, url_link_info: { app_name: string, ma_app_id: string, path: string, query: string, expire_time: number, create_time: number } } {
        let url = `https://developer.toutiao.com/api/apps/url_link/query_info`;
        return http_post_json(url, { access_token: this.access_token, url_link: url_link });
    }
    /**
     * 查询当前小程序配额。
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/share/url-link-query-quota
     */
    public query_quota(): { errcode: number, errmsg: string, url_link_quota: { url_link_used: number, url_link_limit: number } } {
        let url = `https://developer.toutiao.com/api/apps/url_link/query_quota`;
        return http_post_json(url, { access_token: this.access_token, ma_app_id: this.appid });
    }
}

/**
 * 头条小游戏-内容安全相关接口（检测违规图片文字等）
 */
export class security {
    constructor(private access_token: string, private appid: string) {
    }

    public text_check(tasks: Array<{ content: string }>): { log_id: string, data: Array<{ code: number, msg: string, task_id: string, predicts: Array<{ prob: number, target: string, model_name: string }> }> } | { error_id: string, errcode: number, message: string, exception: string } {
        let url = `https://developer.toutiao.com/api/v2/tags/text/antidirt`;
        let body = { tasks: tasks };
        let headers = { "X-Token": this.access_token };
        return http_post_json(url, body, headers);
    }

    public img_check_url(targets: Array<string>, tasks: Array<{ content: string }>): { log_id: string, data: Array<{ code: number, msg: string, task_id: string, predicts: Array<{ prob: number, target: string, model_name: string }> }> } | { error_id: string, errcode: number, message: string, exception: string } {
        let url = `https://developer.toutiao.com/api/v2/tags/image/`;
        let body = { targets: targets, tasks: tasks };
        let headers = { "X-Token": this.access_token };
        return http_post_json(url, body, headers);
    }
}

/**
 * 小游戏订阅相关
 */
export class subscribeMessage {
    constructor(private appid: string, private access_token: string) {
    }

    /**
     * 订阅消息推送.用户产生了订阅模板消息的行为后，可以通过这个接口发送模板消息给用户
     */
    public send(params: { open_id: string, tpl_id: string, data: { [index: string]: string }, page?: string }): { errcode: number, errmsg: string } {
        let url = `https://developer.toutiao.com/api/apps/subscribe_notification/developer/v1/notify`;
        let body = { access_token: this.access_token, app_id: this.appid, ...params };
        return http_post_json(url, body);
    }
}

export interface tt_ClientInfo {
    openid: string,
    // session_key: string,
    zone_id?: string | number,
    user_ip?: string,
    pf?: string
}

/**
 * 虚拟支付-头条钱包
 * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/payment/mini-game-pay-introduction.md
 */
export class virtualPay {

    constructor(private access_token: string, private cfg: { appid: string, sandbox?: boolean, token: string, secret: string }) {
    }

    /**
     * 支付回调校验
     * @param signature
     * @param timestamp
     * @param nonce
     * @param msg
     */
    public verifyPayCallback(signature, timestamp, nonce, msg = ''): boolean {
        return hash.sha1(<any>[this.cfg.token, timestamp, nonce, msg].sort().join("")).digest("hex") == signature;
    }
    /**
     * 支付回调校验
     * @param token
     * @param args
     */
    public static verifyPayCallback(token: string, args: { signature: string, timestamp: string, nonce: string, msg: string }) {
        return hash.sha1(<any>[token, args.timestamp, args.nonce, args.msg || ""].sort().join("")).digest("hex") == args.signature;
    }

    /**
     * 获取游戏币余额
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/payment/acquire-mini-game-coin-balance
     */
    public getBalance(clientInfo: tt_ClientInfo): {
        errcode: number, errmsg: string,
        balance: number, /** 游戏币个数（包含赠送） */
        gen_balance: number, /** 赠送游戏币数量（赠送游戏币数量） */
        first_save: boolean, /** 是否满足历史首次充值 */
        save_amt: number, /** 累计充值金额的游戏币数量 */
        save_sum: number, /**  历史总游戏币金额 */
        cost_sum: number, /** 历史总消费游戏币金额 */
        present_sum: number /** 历史累计收到赠送金额 */
    } {
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android"
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay("https://developer.toutiao.com/api/apps/game/wallet/get_balance", params);
    }

    /**
     * 扣除游戏币。开通了虚拟支付的小游戏，可以通过本接口扣除某个用户的游戏币
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/payment/mini-game-coin-deduction-interface
     */
    public pay(clientInfo: tt_ClientInfo, order: { bill_no: string, amt: number, pay_item?: string, app_remark?: string }): {
        errcode: number, errmsg: string,
        bill_no: string, balance: number, used_gen_amt: number
    } {
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
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
        return this.post_pay("https://developer.toutiao.com/api/apps/game/wallet/game_pay", params, 0);
    }

    /**
     * 游戏币赠送接口
     * @see https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/payment/mini-game-coin-gift-interface
     */
    public present(clientInfo: tt_ClientInfo, order: { bill_no: string, present_counts: number }): { errcode: number, errmsg: string, bill_no: string, balance: number } {
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android",
            bill_no: order.bill_no,
            present_counts: order.present_counts
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay("https://developer.toutiao.com/api/apps/game/wallet/add_coin", params, 0);
    }

    private post_pay(url: string, params: any, retry: number = 1) {
        let path = url.substring(url.indexOf('/', 9), url.lastIndexOf('?'));
        params = this.fixSig("POST", path, params);
        return http_post_json(url, params, {}, retry);
    }
    private fixSig(cgi_method: string, cgi_path: string, params: { [index: string]: any }, secret: string = null) {
        params.access_token = this.access_token;
        params.mp_sig = this.make_mp_sig(cgi_method, cgi_path, params, secret || this.cfg.secret);
        return params;
    }
    private make_mp_sig(cgi_method: string, cgi_path: string, params: { [index: string]: any }, secret: string) {
        let kvs = [];
        Object.keys(params).sort().forEach(k => params[k] != "" && kvs.push(k + '=' + params[k]));
        // console.log(kvs.join("&"),cgi_path, secret)
        return crypto_util.hmac_sha256(secret, `${kvs.join("&")}&org_loc=${cgi_path}&method=${cgi_method}`);
    }
}

function http_post_json(url: string, data: any, headers: any = {}, retry: number = 1) {
    let res: Class_HttpResponse;
    try {
        res = http.post(url, { json: data, headers: headers });
    } catch (e) {
        return { errcode: -500, errmsg: "io_err" };
    }
    if (res.statusCode != 200) {
        return { errcode: -500, errmsg: "io_err_" + res.statusCode };
    }
    let rsp = http_format_rsp(res.json());
    if (rsp.errcode == -1 && retry > 0) {
        coroutine.sleep(Math.floor(20 + Math.random() * 200));
        return http_post_json(url, data, headers, retry);
    }
    return rsp;
}
function http_format_rsp(rspJson: any) {
    let body = rspJson;
    if (Number.isInteger(body.err_no)) {
        body.errcode = body.err_no;
        body.errmsg = body.err_tips || body.errmsg;
    } else {
        if (Number.isInteger(body.error)) {
            body.errcode = body.error;
        } else if (Number.isInteger(body.code)) {
            body.errcode = body.code;
        }
        if (!Number.isInteger(body.errcode)) {
            body.errcode = 0;
        }
        if (typeof body.message == "string") {
            body.errmsg = body.error;
        }
        if (body.errmsg == undefined) {
            body.errmsg = "";
        }
    }
    return body;
}