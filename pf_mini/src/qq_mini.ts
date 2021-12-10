import {getCacheHandler} from "./_util";
import * as http from "http";
import * as coroutine from "coroutine";
import {crypto_util,wx_base_api_res,wx_ClientInfo} from "./wx_mini";
import {Multipart} from "fibjs-multipart";

/**
 * QQ小游戏相关接口
 */

/**
 * qq小游戏-帐号授权（接口调用凭证 和 帐号登录相关）
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
     * @see https://q.qq.com/wiki/develop/game/server/open-port/login.html#code2session
     */
    public code2Session(code: string): { openid: string, session_key: string, unionid?: string } {
        let appid = this.appid, secret = this.secret;
        let url = `https://api.q.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
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
     * 获取小程序全局唯一后台接口调用凭据（access_token）
     * @see https://q.qq.com/wiki/develop/game/server/open-port/getAccessToken.html
     */
    public getAccessToken(): string {
        let cache_key = `access_token:qqmini:${this.appid}`;
        let cache_obj = getCacheHandler();
        let cache_accessToken = cache_obj.get(cache_key);
        if (cache_accessToken) {
            return cache_accessToken;
        }
        let url = `https://api.q.qq.com/api/getToken?grant_type=client_credential&appid=${this.appid}&secret=${this.secret}`;
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
    constructor(private access_token: string, private appid: string) {
    }

    /**
     * 校验一张图片是否含有违法违规内容。
     * @param file
     * @see https://q.qq.com/wiki/develop/miniprogram/server/open_port/port_safe.html#security-imgseccheck
     */
    public img_check(file: string): wx_base_api_res {
        let url = `https://api.q.qq.com/api/json/security/ImgSecCheck?access_token=${this.access_token}`;
        let multipart = new Multipart();
        multipart.field("appid", this.appid);
        multipart.file("media", file);
        let res = multipart.post(url);
        if (res.statusCode == 200) {
            return res.json();
        }
        return {errcode: -2, errmsg: "io_err_" + res.statusCode};
    }

    /**
     * 文本内容检测-新。注意限制频率
     * @param content
     * @see https://q.qq.com/wiki/develop/miniprogram/server/open_port/port_safe.html#security-msgseccheck
     */
    public text_check(content: string): wx_base_api_res {
        let url = `https://api.q.qq.com/api/json/security/MsgSecCheck?access_token=${this.access_token}`;
        return http_post_json(url, {appid: this.appid, content: content});
    }

    /**
     * 异步校验图片/音频是否含有违法违规内容。
     * @param media_url
     * @param media_type
     * @see https://q.qq.com/wiki/develop/miniprogram/server/open_port/port_safe.html#security-mediacheckasync
     */
    public media_check_v1(media_url: string, media_type: number): { errcode: number, errmsg: string, trace_id?: string } {
        let url = `https://api.q.qq.com/api/json/security/MediaCheckAsync?access_token=${this.access_token}`;
        return http_post_json(url, {appid: this.appid, media_url: media_url, media_type: media_type});
    }

}

/**
 * 小程序/小游戏-开放数据域
 */
export class storage {
    constructor(private access_token: string) {
    }

    /**
     * 删除已经上报到微信的key-value数据
     * @param openid
     * @param session_key
     * @param keys
     * @see https://q.qq.com/wiki/develop/game/server/open-port/open-data.html#removeuserstorage
     */
    public removeUserStorage(openid: string, session_key: string, keys: Array<string>): wx_base_api_res {
        let params = {key: keys};
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://api.q.qq.com/api/openDataContext/remove_user_storage?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params, 1);
    }

    /**
     * 上报用户数据后台接口。小游戏可以通过本接口上报key-value数据到用户的CloudStorage
     * @param openid
     * @param session_key
     * @param kv_list
     * @see https://q.qq.com/wiki/develop/game/server/open-port/open-data.html#setuserstorage
     */
    public setUserStorage(openid: string, session_key: string, kv_list: Array<{ key: string, value: string }>) {
        let params = {kv_list: kv_list};
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://api.q.qq.com/api/openDataContext/set_user_storage?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params, 1);
    }

    /**
     * 写用户关系链互动数据存储
     * @param openid
     * @param session_key
     * @param kv_list
     * @see https://q.qq.com/wiki/develop/game/server/open-port/open-data.html#setuserinteractivedata
     */
    public setUserInteractiveData(openid: string, session_key: string, kv_list: Array<{ key: string, value: number }>) {
        let params = {kv_list: kv_list};
        let signature = crypto_util.hmac_sha256(session_key, JSON.stringify(params));
        let url = `https://api.q.qq.com/api/setuserinteractivedata?access_token=${this.access_token}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`;
        return http_post_json(url, params, 1);
    }
}

/**
 * 小程序订阅相关
 */
export class subscribeMessage {
    constructor(private access_token: string) {
    }

    /**
     * 发送订阅消息（用户在小程序/小游戏主动订阅之后）
     * @param params
     * @see https://q.qq.com/wiki/develop/game/server/open-port/port_subscrib.html
     */
    public send(params: { touser: string, template_id: string, data: { [index: string]: { value: string } } | any, page?: string, emphasis_keyword?: string, oac_appid?: string, use_robot?:number }): wx_base_api_res {
        let url = `https://api.q.qq.com/api/json/subscribe/SendSubscriptionMessage?access_token=${this.access_token}`;
        return http_post_json(url, params);
    }
}

/**
 * 虚拟支付
 * @see https://q.qq.com/wiki/develop/game/server/virtual-payment/game_pay.html
 */
export class virtualPay {
    private base_url: string;

    constructor(private access_token: string, private cfg: { appid: string, offer_secret: string }) {
        this.base_url = `https://api.q.qq.com/api/json/openApiPay/`;
    }

    /**
     * 支付回调校验
     * @param callBackCgiPath
     * @param args
     */
    public verifyPayCallback(callBackCgiPath: string, args: { [index: string]: any }): boolean {
        // let keys = ["openid","bill_no","amt","ts","sig"];
        let psig = args.sig;
        delete args.sig;
        let kps = [];
        Object.keys(args).sort().forEach(k => k != "user_ip" && kps.push(k + '=' + encodeURI(args[k])))
        let sig_url_p = "POST&" + encodeURIComponent(callBackCgiPath) + "&" + kps.join("&") + "&AppSecret=" + this.cfg.offer_secret;
        let sig_now = crypto_util.hmac_sha256(this.cfg.offer_secret, sig_url_p);
        return sig_now == psig;
    }

    public prePay(clientInfo: wx_ClientInfo, order: { bill_no: string, amt: number, goodid: string, good_num: number, app_remark?: string }): { errcode: number, errmsg: string, prepayId: string } {
        let url = `${this.base_url}/GamePrePay?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android",
            amt: order.amt,
            bill_no: order.bill_no,
            goodid: order.goodid, good_num: order.good_num,
        }
        if (order.app_remark && order.app_remark.length > 0) params.app_remark = order.app_remark;
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params, 0);
    }

    /**
     * 查询支付状态。玩家下单购买道具后，如果开发商没有收到支付支付通知，可以通过这个接口查询支付结果
     * @param clientInfo
     * @param prepay_id
     * @param bill_no
     */
    public checkPay(clientInfo: wx_ClientInfo, prepay_id: string, bill_no: string): { errcode: number, errmsg: string, pay_state: number, pay_time: number, app_remark: string } {
        let url = `${this.base_url}/CheckGamePay?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            openid: clientInfo.openid,
            bill_no: bill_no, prepay_id: prepay_id,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android"
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params);
    }

    /**
     * 获取游戏币余额。开通了虚拟支付的小游戏，可以通过本接口查看某个用户的游戏币余额
     * @param clientInfo
     */
    public getBalance(clientInfo: wx_ClientInfo): {
        errcode: number, errmsg: string, remainder: number
    } {
        let url = `${this.base_url}/GetBalance?access_token=${this.access_token}`;
        let params: { [index: string]: any } = {
            appid: this.cfg.appid,
            openid: clientInfo.openid,
            ts: Math.floor(Date.now() / 1000),
            zone_id: clientInfo.zone_id || "1",
            pf: clientInfo.pf || "android"
        }
        if (clientInfo.user_ip && clientInfo.user_ip.length > 0) params.user_ip = clientInfo.user_ip;
        return this.post_pay(clientInfo.session_key, url, params);
    }

    private post_pay(session_key: string, url: string, args: any, retry: number = 1) {
        let path = url.substring(url.indexOf('/', 9), url.lastIndexOf('?'));
        args = this.fixSig(path, args, session_key)
        return http_post_json(url, args, retry);
    }

    private fixSig(cgi_path: string, args: { [index: string]: any }, session_key: string) {     //回调使用
        let kps = [];
        Object.keys(args).sort().forEach(k => k != "user_ip" && kps.push(k + '=' + encodeURI(args[k])))
        let sig_url_p = "POST&" + encodeURIComponent(cgi_path) + "&" + kps.join("&") + "&session_key=" + session_key;
        args.sig = crypto_util.hmac_sha256(session_key, sig_url_p);
        return args;
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