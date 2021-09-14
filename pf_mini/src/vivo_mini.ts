import * as http from "http";
import * as hash from "hash";
import * as uuid from "uuid";

/**
 * vivo小游戏相关接口
 */
export class vivo_mini{
    constructor(private cfg: { pkgName: string, appKey: string, appSecret: string, appId:string }) {
    }

    /**
     * 登录凭证校验，获取帐号openid等信息
     * @param token
     * @see https://minigame.vivo.com.cn/documents/#/api/service/newaccount
     */
    public userInfo(token: string): { openid: string, nick: string, head: string, sex:number }&any {
        let url = `https://quickgame.vivo.com.cn/api/quickgame/cp/account/userInfo`;
        let timestamp = Date.now();
        let nonce = uuid.random().toString("hex");
        let qs = `appKey=${this.cfg.appKey}&appSecret=${this.cfg.appSecret}$nonce=${nonce}&pkgName=${this.cfg.pkgName}&timeStamp=${timestamp}&token=${token}`;
        let signature = hash.sha256(<any>qs).digest("hex");
        let query = {
            pkgName: this.cfg.pkgName,
            timestamp: timestamp,
            nonce: nonce,
            token: token,
            signature: signature,
        };
        let res = http.get(url, {query:query});
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.data) {
                let user = body.data;
                return {openid: user.openId, nick: user.nickName, head: user.smallAvatar, sex:user.gender, big:user.biggerAvatar };
            }
            throw new Error(`jscode2session:${this.cfg.pkgName}:${body.code}_${body.msg}`);
        }
        throw new Error(`jscode2session:${this.cfg.pkgName}:${res.statusCode}:io_err`);
    }

}