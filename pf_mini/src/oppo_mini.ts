import * as http from "http";
import * as hash from "hash";

/**
 * oppo小游戏相关接口
 */
export class oppo_mini {

    constructor(private cfg: { pkgName: string, appKey: string, appSecret: string, appId:string }) {
    }

    /**
     * 登录凭证校验，获取帐号openid等信息
     * @param token
     * @see https://activity-cdo.heytapimage.com/cdo-activity/static/201810/26/quickgame/documentation/#/feature/account?id=qgloginobject
     */
    public userInfo(token: string): { openid: string, nick: string, head: string, sex:number, age:number }&any {
        let url = `https://play.open.oppomobile.com/instant-game-open/userInfo`;
        let timeStamp = Date.now();
        let qs = `appKey=${this.cfg.appKey}&appSecret=${this.cfg.appSecret}&pkgName=${this.cfg.pkgName}&timeStamp=${timeStamp}&token=${token}`;
        let sign = hash.md5(<any>qs).digest("hex").toUpperCase();
        let query = {
            pkgName: this.cfg.pkgName,
            timeStamp: timeStamp,
            token: token,
            sign: sign,
        };
        let res = http.get(url, {query:query});
        if (res.statusCode == 200) {
            let body = res.json();
            if (body.userInfo) {
                let user = body.userInfo;
                let sex = user.sex=="F" ? 2:(user.sex=="M" ? 1:0);
                return {openid: user.userId, nick: user.userName, head: user.avatar, sex:sex, age:user.age, location: user.location, constellation: user.constellation };
            }
            throw new Error(`jscode2session:${this.cfg.pkgName}:${body.errorcode}_${body.errormsg}`);
        }
        throw new Error(`jscode2session:${this.cfg.pkgName}:${res.statusCode}:io_err`);
    }

    /**
     * 更新用户排行榜分数
     * @see https://activity-cdo.heytapimage.com/cdo-activity/static/201810/26/quickgame/documentation/#/feature/leaderboard
     */
    public up(openid: string, rankScore:number, rankType:number=0){
        let url = `https://play.open.oppomobile.com/instant-game-open/rank/update`;
        let timeStamp = Date.now();
        let qs = `appKey=${this.cfg.appKey}&appSecret=${this.cfg.appSecret}&pkgName=${this.cfg.pkgName}&rankScore=${rankScore}&rankType=${rankType}&timeStamp=${timeStamp}&userId=${openid}`;
        let sign = hash.md5(<any>qs).digest("hex").toUpperCase();
        let str = `userId=${openid}&pkgName=${this.cfg.pkgName}&rankType=${rankType}&rankScore=${rankScore}&sign=${sign}&timeStamp=${timeStamp}`;
        let res = http.post(url, {body:str}).json();
        if (res.statusCode == 200) {
            let body = res.json();
            if(body.errCode!=0){
                console.warn("oppo_rank_update_fail:%n %s", body.errCode, body.errMsg);
                return false;
            }
            return true;
        } else {
            throw new Error(`jscode2session:${this.cfg.pkgName}:${res.statusCode}:io_err`);
        }
    }

}