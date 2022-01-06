import {ANY, API, docs_helper, GET, Header, Ip, JsonRes, REPEATER, RULE, TextRes} from "pf_api";

/**
 * 公共API类
 * @state ok
 * @api public
 */
@API({path:"", res:JsonRes})
class Public {
    /**
     * ping
     * 简单的ping/pong
     * @state dev
     * @returns string data
     * @tpl ok {"code":0,"data":"pong"}
     */
    @ANY()
    public ping(){
        return "pong";
    }
    /**
     * 参数打招呼
     * @state ok
     * @returns string data
     * @tpl ok {"code":0,"data":"hi,Jenny"}
     */
    @ANY("/hello")
    public hello(nick:string){
        return "hi, "+nick;
    }

    /**
     * 获取路径参数
     * @state ok
     * @returns string data
     * @tpl ok {"code":0,"data":"hi,PathNode321"}
     */
    @ANY("/testPathArg/([a-zA-Z0-9]+)")
    public testPathArg(@RULE({src:"PATH"})key:string){
        return key;
    }

    /**
     * 请求自己IP
     * 返回请求者IP和当前系统时间
     * @state ok
     * @returns object _.code 返回的接口状态码(body.code)
     * @returns object _.data 返回字段的(body.data)
     * @returns string _.data.ip 自己的IP(body.data.ip)
     * @returns number _.data.now 当前系统毫秒时间(body.data.now)
     * @tpl ok {"code":0,"data":"hi,Jenny"}
     */
    @GET()
    public getIP(@Ip() cip:string, @Header({name:"User-Agent"}) ua:string){
        return {ip:cip, now:Date.now(), ua:ua};
    }

    /**
     * 转发
     * 请求中继转发给其他地址处理
     * @state ok
     */
    @REPEATER({toUrl:"http://127.0.0.1:9080/"})
    public testRp(path:string, suc:boolean){
        console.log("repeater",path,suc);
    }

    /**
     * 文档接口
     * API接口文档
     * @api server
     * @state ok
     */
    @GET({res: TextRes, filter:ctx=>{let a=ctx.getSocket().remoteAddress;return a.startsWith("10.")||a.startsWith("192.")||a.startsWith("127.")}})
    public docs(@RULE({option: true})group: string, @RULE({option: true, name: "s"})service: string) {
        if (process.env.PRODUCT && process.env.PRODUCT!="dev") {
            return "null";
        }
        return docs_helper.genarateDocsHtml({group:group, service:service});
    }
}