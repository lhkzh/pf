import {WEBSOCKET} from "pf_api";

/**
var sock=new WebSocket("ws://localhost:9080/websocket/bomb");sock.onerror=e=>console.error(e+"");sock.onclose=e=>console.log("onclose");sock.onopen=e=>console.log("onopen");sock.onmessage=e=>console.log("onmessage",e.data);
setTimeout(()=>{ sock.send("hey") },1000);
 */

/**
 * websocket-处理
 * @api user
 * @state ok
 */
@WEBSOCKET("/websocket/([a-zA-Z0-9]{4})")
export class WebsocketHandler {
    private token:string;
    public onCheck(req:Class_HttpRequest, regExpPart:string){
        if("fuck"==regExpPart){
            return false;
        }
        this.token = regExpPart;
        return true;
    }
    public onOpen(conn:Class_WebSocket, req:Class_HttpRequest){
        console.log("websocket.onOpen", this.token);
    }
    public onClose(){
        console.log("websocket.onClose", this.token);
    }
    public onText(data:string, conn:Class_WebSocket){
        console.log("websocket.onText", this.token, data);
        conn.send("rsp:"+data);
    }
}