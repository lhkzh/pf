import {getCacheHandler} from "./_util";
import * as http from "http";
import {wx_base_api_res} from "./wx_mini";

/**
 * 快手小游戏相关接口
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
     * @see https://mp.kuaishou.com/docs/develop/server/code2Session.html
     */
    public code2Session(code: string): { openid: string, session_key: string, unionid?: string } {
        let url = `https://open.kuaishou.com/oauth2/mp/code2session`;
        let res = http.post(url, {body: {js_code: code, app_id: this.appid, app_secret: this.secret}});
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.open_id) {
                return {openid: body.open_id, session_key: body.session_key};
            }
            throw new Error(`jscode2session:${this.appid}:${body.result}_${body.error}_${body.error_msg}`);
        } else {
            throw new Error(`jscode2session:${this.appid}:${res.statusCode}:io_err`);
        }
        return null;
    }

    /**
     * 获取小程序全局唯一后台接口调用凭据（access_token）
     * @see https://mp.kuaishou.com/docs/develop/server/getAccessToken.html
     */
    public getAccessToken(): string {
        let cache_key = `access_token:qqmini:${this.appid}`;
        let cache_obj = getCacheHandler();
        let cache_accessToken = cache_obj.get(cache_key);
        if (cache_accessToken) {
            return cache_accessToken;
        }
        let url = `https://open.kuaishou.com/oauth2/access_token`;
        let res = http.post(url, {
            body: {
                app_id: this.appid,
                app_secret: this.secret,
                grant_type: "client_credentials"
            }
        });
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.result != 1) {
                throw new Error(`access_token:${this.appid}:${body.result}_${body.error}_${body.error_msg}`);
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
 * 小程序订阅相关
 */
export class subscribeMessage {
    constructor(private access_token: string, private appid: string) {
    }

    /**
     * 发送订阅消息（用户在小程序/小游戏主动订阅之后）
     * @param params
     * @see https://mp.kuaishou.com/docs/develop/server/sendMessage.html
     */
    public send(params: { appid: string, touser: string, template_id: string, data: { [index: string]: { value: string } } | any, page?: string }): wx_base_api_res {
        let url = `https://open.kuaishou.com/openapi/mp/developer/message/template/send`;
        let body = {
            access_token: this.access_token,
            app_id: params.appid,
            to_user: params.touser,
            template_id: params.template_id,
            page: params.page,
            data: JSON.stringify(params.data)
        };
        let res = http.post(url, {body: body});
        if (res.statusCode == 200) {
            let body = res.json();
            return {
                errcode: body.result == 1 ? 0 : body.result,
                errmsg: body.error_msg
            }
        }
        return {errcode: -500, errmsg: "io_err_" + res.statusCode};
    }
}