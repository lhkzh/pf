//腾讯云函数入口
//process.env["SCF_NAMESPACE"]
const http=require("http");
const querystring=require("querystring");
const pf_api=require("pf_api");
// do initialize
const scf_host = process.env.SCF_RUNTIME_API;
const scf_port = process.env.SCF_RUNTIME_API_PORT;
const scf_func_name = process.env._HANDLER;
// console.log("env=>",JSON.stringify(process.env));
const scf_ready_url = `http://${scf_host}:${scf_port}/runtime/init/ready`;
const scf_event_url = `http://${scf_host}:${scf_port}/runtime/invocation/next`;
const scf_response_url = `http://${scf_host}:${scf_port}/runtime/invocation/response`;
const scf_error_url = `http://${scf_host}:${scf_port}/runtime/invocation/error`;

// require("./app_env",__dirname);
require(__dirname+"/dist/boot_handler.js");
let ready_rsp = http.post(scf_ready_url, {json:{msg:"fibjs ready"}});
if(!ready_rsp || ready_rsp.statusCode!=200 || !ready_rsp.data){
    throw new Error("scf_ready_fail");
}
// post ready -- finish initialization

function process_event(evt='') {
    if (evt.length === 0) {
        send_err('event_fail');
    } else {
        let evt_data = JSON.parse(evt);
        if(evt_data.isBase64Encoded){
            evt_data.body = Buffer.from(evt_data,"base64");
        }
        if(evt_data.body && typeof evt_data.body=="string"){
            if(evt_data.headers["content-type"].indexOf("form-urlencoded")>0){
                evt_data.body = querystring.parse(evt_data.body);
            }
        }
        let req_path = evt_data.path.substr(evt_data.requestContext.path.length);
        let req_ip = evt_data.requestContext.sourceIp;
        let req_param = evt_data.body ? {...evt_data.queryString,...evt_data.body}:evt_data.queryString;
        //[request_id,params_obj,header_obj,pathArg]
        pf_api.tmp_call_api({ip:req_ip, path:req_path, params:req_param, headers:evt_data.headers}, send_response);
    }
}
function send_response(content_type, out_headers, data){
    let headers = out_headers?out_headers:{};
    if(content_type){
        headers["Content-Type"] = content_type;
    }
    let isBase64Encoded = Buffer.isBuffer(data);
    if(isBase64Encoded){
        data = Buffer.from(data).toString("base64");
    }
    http.post(scf_response_url, {json:{
            isBase64Encoded:isBase64Encoded,
            statusCode:200,
            headers:headers,
            body:data
        }});
}
function send_err(errMsg, statusCode=500){
    http.post(scf_error_url, {json:{
            isBase64Encoded:false,
            statusCode:statusCode,
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({msg:errMsg})
        }});
}

while (true) {
    // get event
    const rsp = http.get(scf_event_url)
    const data = rsp.data?rsp.data.toString():'';
    //console.log('step_event',rsp.statusCode,rsp.statusMessage,JSON.stringify(rsp.headers),data);
    //coroutine.start(processEvent, data?'':data.toString());
    process_event(data);
}