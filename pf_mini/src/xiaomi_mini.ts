import * as http from "http";
import * as hash from "hash";
import * as uuid from "uuid";

/**
 * 小米快游戏相关接口
 */
export class Xiaomi_mini{
    constructor(private cfg: { pkgName: string, appKey: string, appSecret: string, appId:string }) {
    }

    /**
     * 验证用户session(服务端)[必接]
     * @param loginRsp
     * @see https://dev.mi.com/console/doc/detail?pId=1739
     */
    public loginvalidate(loginRsp:{session: string, appAccountId:number}): { openid:string, session:string, adult:number } {
        let url = `https://mis.migc.xiaomi.com/api/biz/service/loginvalidate`;
        let timestamp = Date.now();
        let nonce = uuid.random().toString("hex");
        let query: any = {
            appId: this.cfg.appId,
            session: loginRsp.session,
            uid: loginRsp.appAccountId,
        };
        query.signature = this.sig(query);

        let res = http.get(url, {query:query});
        if (res.statusCode == 200) {
            let body = res.json();
            if(body.errcode==200){
                if(!body.hasOwnProperty("adult")){
                    body.adult = 409;
                }
                return {openid:loginRsp.appAccountId+"", session:loginRsp.session, adult:body.adult};
            }
            throw new Error(`xiaomi_loginvalidate:${this.cfg.appId}:${body.errcode}_${body.errMsg}`);
        }
        throw new Error(`xiaomi_loginvalidate:${this.cfg.appId}:${res.statusCode}:io_err`);
    }

    private sig(params: { [index: string]: any }){
        let kvs = [];
        Object.keys(params).sort().forEach(k => kvs.push(k + '=' + params[k]));
        return hash.hmac_sha1(<any>this.cfg.appSecret, <any>kvs.join("&")).digest("hex");
    }
}