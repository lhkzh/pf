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
     */
    @ANY()
    public ping(){
        return "pong";
    }
    /**
     * 参数打招呼
     * @state ok
     */
    @ANY("/hello")
    public hi(nick:string){
        return "hi, "+nick;
    }
    /**
     * 获取路径参数
     * @state ok
     */
    @ANY("/pathArg/([a-zA-Z0-9]+)")
    public pathArg(@RULE({src:"PATH"})key:string){
        return key;
    }

    /**
     * 转发
     * 请求中继转发给其他地址处理
     * @state ok
     */
    @REPEATER({toUrl:"http://127.0.0.1:9080/"})
    public rp(path:string, suc:boolean){
        console.log("repeater",path,suc);
    }

    @GET()
    public getCip(@Ip() cip:string, @Header({name:"User-Agent"}) ua:string){
        return cip+" "+ua;
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
        return docs_helper.genarateDocsHtml(group, service);
    }
}