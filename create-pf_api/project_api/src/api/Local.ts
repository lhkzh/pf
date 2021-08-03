import {API, Body, JsonRes, POST, RULE, XmlRes} from "pf_api";
/**
 * 本地API类
 * @state dev
 * @api server
 */
@API({res:JsonRes, filter:ctx=>{ return ctx.getSocket().remoteAddress=="127.0.0.1"; }})
export class Local {
    constructor() {
    }
    /**
     * 参数打招呼1
     * @state dev
     */
    @POST({res:XmlRes})
    public xmlSay(@Body({min:2, max:32}) msg:string){
        return {content:"悄悄话："+msg};
    }
    /**
     * 参数打招呼2
     * @state ok
     */
    @POST()
    public jsonTalk(@Body({min:2, max:32}) msg:string){
        return {content:"悄悄话："+msg};
    }
}