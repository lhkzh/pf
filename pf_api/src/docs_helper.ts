/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * api文档相关函数
 */
import {ApiParamRule} from "./api_ctx";
import {current_api_ctx, current_api_path, Facade} from "./api_facade";

const CDN_JS_PRE = "https://lib.baomitu.com/jquery/1.12.4/";
const CDN_CSS_PRE = "https://lib.baomitu.com/semantic-ui/2.4.1/";
const CDN_CSS_PRE_CS = CDN_CSS_PRE + "components/";

//删减所有换行符为一行
export function html2line(source: string): string {
    var rep = /\n+/g;
    var repone = /<!--.*?-->/ig;
    var reptwo = /\/\*.*?\*\//ig;
    var reptree = /[ ]+</ig;
    var sourceZero = source.replace(rep, "");
    var sourceOne = sourceZero.replace(repone, "");
    var sourceTwo = sourceOne.replace(reptwo, "");
    var sourceTree = sourceTwo.replace(reptree, "<");
    return sourceTree;
    // return source;
}

//构造接口文档html
export function genarateDocsHtml(filterGroup: string, service: string, assetLocalDir?: string, cfg: { project: string, groups: { [index: string]: string } } = {
    project: "app",
    groups: {"user": "客户接口", "server": "内网接口", "dev": "开发工具", "all": "所有", "inner": "系统内循环"}
}) {
    // let local_doc_res = null;//"doc_res/";//如果选择用默认库中公共CDN资源设置为null
    let docs = Facade._docs;
    let source: string;
    if (service) {
        service = decodeURIComponent(service);
        // console.log(JSON.stringify(docs));
        var foundFn = null;
        M:for (var k in docs) {
            var module = docs[k].list;
            for (var f of module) {
                if (f.path == service) {
                    foundFn = f;
                    break M;
                }
            }
        }
        if (!foundFn) {
            return "NotFound:" + service;
        }
        // console.log(JSON.stringify(foundFn))
        let headers = current_api_ctx(this).getHeaders();
        let url = (headers["X-Forwarded-Proto"] || "http") + "://" + headers["host"] + service;
        source = docs_desc(url, foundFn, false, ["X-Wx-Skey", "uid"], assetLocalDir);
    } else {
        // console.log(docs)
        source = docs_list(cfg.project, docs, filterGroup || "all", cfg.groups, true, assetLocalDir, current_api_path());
    }
    return source;
}

/**
 * 生成-API文档列表
 * @param project
 * @param docs
 * @param group
 * @param groupNameMap
 * @param comporess
 * @param doc_res_dir
 */
export function docs_list(project: string, docs: { [index: string]: DocNode }, group?: string, groupNameMap?: { [index: string]: string }, comporess?: boolean, doc_res_dir?: string, curPagePath: string = "docs.php") {
    group = group || "all";
    groupNameMap = groupNameMap || {"user": "客户接口", "server": "内网接口", "dev": "开发工具", "all": "所有"};
    var group_options = "";
    for (var k in groupNameMap) {
        var selected = group == k ? ' selected' : '';
        group_options += "<option value ='?group=" + k + "' " + selected + ">" + groupNameMap[k] + "</option>";
    }
    var pre = tpl_pre_list.replace("{$options}", group_options).replace(/\{\{project\}\}/g, project);
    var parts = [];
    var No = 0;
    for (var base in docs) {
        var node: DocNode = docs[base];
        if (!node.list || !node.list.length) {
            continue;
        }
        var module = `<tr style='border-top: 3px solid #333; border-bottom: 2px solid #ccc; background: #ddd;'>
                    <td colspan='5'><b>模块：<font color='#2a6496'>{$moduleState}</font></b>
                    <span style='margin-left: 30px;'>{$moduleName}</span></td>
                    <td>{$desc}&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>`;
        parts.push(module.replace("{$moduleState}", node.cms ? node.cms.state : "unknow")
            .replace("{$moduleName}", node.name)
            .replace("{$moduleDesc}", node.cms ? node.cms.desc : "")
            .replace("{$desc}", node.cms ? node.cms.desc : ""));
        for (var j = 0; j < node.list.length; j++) {
            var item = node.list[j];
            if (group != "all" && (!item.cms || item.cms.group != group)) {
                continue;
            }
            var link = curPagePath + "?s=" + encodeURIComponent(item.path);
            parts.push(
                "<tr><td style='text-align: center;'>" + No + "</td><td style='text-align: center;'>" + (item.cms ? item.cms.state : "unknow") + "</td>"
            );
            parts.push("<td><a href='" + link + "' target='_blank'>" + (item.code != 0 ? item.path + "|" + item.code : item.path) + "</a></td>");
            // parts.push("<td>["+(item.cms?item.cms.desc:item.name)+"]</td><td>|"+(item.cms?item.cms.desc:"")+"</td></tr>");
            var desc_str = (item.cms ? item.cms.desc : "").trim();
            var desc_title = item.name, desc_more = "";
            if (desc_str.length > 0) {
                if (desc_str.indexOf('\n') < 1) {
                    desc_title = desc_str;
                } else {
                    var desc_str_arr = desc_str.split('\n');
                    desc_title = desc_str_arr.shift();
                    desc_more = desc_str_arr.join(" ");
                }
            }
            parts.push("<td>[" + desc_title + "]</td><td>|" + desc_more + "</td></tr>");
        }
    }
    var html = pre + parts.join("\n") + `                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
<link rel="stylesheet" href="${CDN_CSS_PRE}semantic.min.css">
<link rel="stylesheet" href="${CDN_CSS_PRE_CS}table.min.css">
<link rel="stylesheet" href="${CDN_CSS_PRE_CS}container.min.css">
<link rel="stylesheet" href="${CDN_CSS_PRE_CS}message.min.css">
<link rel="stylesheet" href="${CDN_CSS_PRE_CS}label.min.css">
</body>
</html>`;
    html = comporess ? html2line(html) : html;
    if (doc_res_dir && doc_res_dir.length > 0) {
        while (html.indexOf(CDN_CSS_PRE_CS) > 0) {
            html = html.replace(CDN_CSS_PRE_CS, doc_res_dir);
        }
        while (html.indexOf(CDN_CSS_PRE) > 0) {
            html = html.replace(CDN_CSS_PRE, doc_res_dir);
        }
    }
    return html;
}


/**
 * 单个接口的文档
 * @param url
 * @param node
 * @param comporess
 * @param globalVars
 * @param doc_res_dir
 */
export function docs_desc(url: string, node: DocApiNode, comporess?: boolean, globalVars = [], doc_res_dir?: string) {
    var doc = tpl_api_desc.replace(/\{\$service\}/g, (node.code != 0 ? node.path + "|" + node.code : node.path))
        .replace(/\{\$descComment\}/g, node.cms ? node.cms.desc : "?")
        .replace(/\{\$url\}/g, url)
        .replace(/\{\$path\}/g, node.path);
    if (node.method == "GET" || node.method == "HEAD") {
        doc = doc.replace("{$request_method}", '<option value="GET">GET</option>');
    } else {
        doc = doc.replace("{$request_method}", '<option value="POST">POST</option>');
    }
    //{$param_desc}
    var rules_arr = [];
    for (var i = 0; i < node.rules.length; i++) {
        var rule = node.rules[i];
        var name = rule.name;
        var type = rule.type.name.toString();
        var required = rule.option ? "可选" : "必选";
        var defval = String(rule.option && rule.hasOwnProperty('default') ? rule.default : "");
        var others = [];
        if (rule.min != undefined) {
            others.push("$>=" + rule.min)
        }
        if (rule.max != undefined) {
            others.push("$<=" + rule.max);
        }
        if (Array.isArray(rule.in)) {
            others.push("in[" + rule.in.join(",") + "]");
        }
        if (rule.src) {
            others.push("from:" + rule.src);
        }
        var other_src = others.join(" & ");
        var desc = rule.desc || (node.cms && node.cms.params ? node.cms.params[rule.name] : "");
        rules_arr.push(
            "<tr><td>" + name + "</td><td>" + type + "</td><td>" + required + "</td><td>" + defval + "</td><td>" + other_src + "</td><td>" + desc + "</td></tr>"
        )
    }
    doc = doc.replace("{$param_desc}", rules_arr.join("\n"));
    //{$returns}
    var returns_arr = [];
    if (node.cms && node.cms.returns.length > 0) {
        for (var i = 0; i < node.cms.returns.length; i++) {
            var returnNode = node.cms.returns[i];
            var name = returnNode.name;
            var type = returnNode.desc.split(" ")[0];
            var detail = returnNode.desc.substr(type.length).trim();
            returns_arr.push("<tr><td>" + name + "</td><td>" + type + "</td><td>" + detail + "</td></tr>");
        }
    }
    doc = doc.replace("{$returns}", returns_arr.join("\n"));

    //  {$param_input}
    var ipts_arr = [];
    var ids_arr = [];
    for (var i = 0; i < node.rules.length; i++) {
        var rule = node.rules[i];
        var name = rule.name;
        var option = rule.option ? "可选" : "必须";
        var defval = String(rule.option && rule.hasOwnProperty('default') ? rule.default : "");
        var desc = rule.desc || "";
        var ipt = rule.type.name.toString().indexOf("File") > 0 ? "file" : "text";
        var source = rule.src == "get" ? "GET" : (rule.src == "header" ? "HEADER" : "POST");
        if (rule.src == "path") {
            continue;
        }
        var ipt_id = "i_" + name;
        var tmp = "<tr><td>" + name + "</td><td>" + option + "</td>\n" +
            "        <td><input data-source=\"" + source + "\" id=\"" + ipt_id + "\"  name=\"" + name + "\" value=\"" + defval + "\" placeholder=\"" + desc + "\" style=\"width:100%;\" class=\"C_input\" type=\"" + ipt + "\" data-type=\"" + ipt + "\"/></td>\n" +
            "            </tr>";
        if (rule.multline) {
            tmp = "<tr><td>" + name + "</td><td>" + option + "</td>\n" +
                "        <td><textarea data-source=\"" + source + "\" id=\"" + ipt_id + "\"  name=\"" + name + "\" value=\"" + defval + "\" placeholder=\"" + desc + "\" style=\"width:100%;\" class=\"C_input\" type=\"" + ipt + "\" data-type=\"" + ipt + "\"></textarea></td>\n" +
                "            </tr>";
        }
        ipts_arr.push(tmp);
        ids_arr.push(ipt_id);
    }
    doc = doc.replace("{$param_input}", ipts_arr.join("\n"));
    if (comporess) {
        doc = html2line(doc);
    }
    var js_doc = js_tpl_desc.replace("{$form_fields}", JSON.stringify(ids_arr)).replace('{$gvars}', JSON.stringify(globalVars));
    js_doc = doc.replace("{$js_tpl}", js_doc);
    if (doc_res_dir && doc_res_dir.length > 0) {
        while (js_doc.indexOf(CDN_JS_PRE) > 0) {
            js_doc = js_doc.replace(CDN_JS_PRE, doc_res_dir);
        }
        while (js_doc.indexOf(CDN_CSS_PRE_CS) > 0) {
            js_doc = js_doc.replace(CDN_CSS_PRE_CS, doc_res_dir);
        }
        while (js_doc.indexOf(CDN_CSS_PRE) > 0) {
            js_doc = js_doc.replace(CDN_CSS_PRE, doc_res_dir);
        }
    }
    return js_doc;
}


export interface DocNode {
    name: string,
    method: string,
    cms?: { group: string, desc: string, state: string },
    list: Array<{
        method?: string,
        path: string,
        code: number,
        rules: Array<any>,
        name: string,
        cms?: {
            group: string, desc: string,
            params: { [index: string]: string },
            returns: [{ name: string, desc: string }],
            tpls: [{ name: string, desc: string }],
            state: string
        }
    }>
}


interface DocApiNode {
    method?: string,
    name: string,
    path: string,
    code: number,
    rules: Array<ApiParamRule>,
    cms?: {
        group: string, desc: string,
        params: { [index: string]: string },
        returns: [{ name: string, desc: string }],
        tpls: [{ name: string, desc: string }],
        state: string
    }
}

//API列表
const tpl_pre_list = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{project}} - 接口列表</title>
    <script>
        function jump_get(t) {
            var docurl =t.options[t.selectedIndex].value;
            document.location.href = docurl;
        }
    </script>
</head>
<body style="font-family: 微软雅黑;">
<br /><div class="ui text container" style="max-width: none !important; width: 1200px" id="menu_top">
    <div class="ui floating message">
        <div style="background: #efefef;border-radius: 6px;padding: 0px 60px 5px 60px;">
            <div style="padding-top: 10px;">
                <span style="margin-left: 40px;">
                    接口类型：
                    <select onchange=jump_get(this) >
                        {$options}
                    </select>
                </span>
                <table class="table table-hover">
                    <thead>
                    <tr>
                        <th style="min-width: 40px; text-align: center;">#</th>
                        <th style="min-width: 60px; text-align: center;">状态</th>
                        <th style="min-width: 80px;">接口服务</th>
                        <th style="min-width: 160px;">接口名称</th>
                        <th>更多说明</th>
                    </tr>
                    </thead>
                    <tbody>`;

const tpl_api_desc = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{$service} - 在线接口文档</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    <script src="${CDN_JS_PRE}jquery.min.js"></script>
</head>
<body>
    <div class="ui text container" style="max-width: none !important;">
        <div class="ui floating message">
    <h3 class='ui header'>接口：{$service}</h3>
            <div class="ui raised segment">
                <div class="ui message">
                    {$descComment}
                </div>
            </div>
            <h5>接口参数</h5>
            <table class="ui red celled striped table" >
                <thead>
                    <tr><th>参数名字</th><th>类型</th><th>是否必须</th><th>默认值</th><th>其他</th><th>说明</th></tr>
                </thead>
                <tbody>
                    {$param_desc}
                </tbody>
            </table>
            <h5>返回结果</h5>
            <table class="ui green celled striped table" >
                <thead>
                    <tr><th>返回字段</th><th>类型</th><th>说明</th></tr>
                </thead>
                <tbody>
                    {$returns}
                </tbody>
            </table>
<h5>
    请求模拟 &nbsp;&nbsp;
</h5>
<table class="ui green celled striped table" >
    <thead>
        <tr><th>参数</th><th>是否必填</th><th>值</th></tr>
    </thead>
    <tbody id="params">
        {$param_input}
    </tbody>
</table>
<div style="display: flex;align-items:center;">
    <select name="request_type" style="font-size: 14px; padding: 2px;">
        {$request_method}
    </select>
<input name="request_url" value="{$url}" style="width:500px; height:24px; line-height:18px; font-size:13px;position:relative; padding-left:5px;margin-left: 10px"/>
    <script>
        var url_base = location.origin+location.pathname.substr(0,location.pathname.lastIndexOf('/')+1);
        var url_api = "{$path}";
        var url_full = url_base+url_api;
        if(url_base.endsWith('/') && url_api.startsWith("/")){
            url_full = url_base+url_api.substr(1);
        }
        document.getElementsByName("request_url")[0].value=url_full;
    </script>
    <input type="submit" name="submit" value="发送" id="submit" style="font-size:14px;line-height: 20px;margin-left: 10px "/>
</div>
<div class="ui blue message" id="json_output"></div>
    <div class="ui blue message">
      <strong>温馨提示：</strong> 此接口参数列表根据后台代码自动生成，可修改url
    </div>
    </div>
</div>
{$js_tpl}
</body>
    <link rel="stylesheet" href="${CDN_CSS_PRE}semantic.min.css">
    <link rel="stylesheet" href="${CDN_CSS_PRE_CS}table.min.css">
    <link rel="stylesheet" href="${CDN_CSS_PRE_CS}container.min.css">
    <link rel="stylesheet" href="${CDN_CSS_PRE_CS}message.min.css">
    <link rel="stylesheet" href="${CDN_CSS_PRE_CS}label.min.css">
</html>
`
const js_tpl_desc = `    <script type="text/javascript">
        function getData() {
            var form = new FormData();
            var hadForm = false;
            var header = {};
            var geter = [];
            var inputIds = {$form_fields};
            inputIds.forEach(id=>{
                var e=$("#"+id);
                var val=e.val();
                var s=e.data("source");
                var type=e.data("type")||e[0].type;
                var name=e.attr("name");
                if (type != 'file'){
                    if(s=="POST" || s=="REQUEST"){
                        form.append(name, val);hadForm=true;
                    }else if(s=="GET"){
                        geter.push(name+"="+encodeURIComponent(val));
                    }else if(s=="HEADER"){
                        header[name] = val;
                    }
                    setHistory(name, val);
                } else{
                    var files = (e.files?e.files:e[0].files)||[];
                    if (files.length == 1){
                        form.append(name, files[0]);
                    } else{
                        for (var i = 0; i < files.length; i++) {
                            form.append(name + '[]', files[i]);
                        }
                    }
                    hadForm=true;
                }
            });
            if(hadForm==false)form="";
            return {get:geter.join("&"),header:header,form:form};
        }
        
        $(function(){
            $("#submit").on("click",function(){
                $("#json_output").html("...");
                $("#submit").hide();
                var data = getData();
                var headers = data.header; 
                var form = data.form; 
                var geter=data.get;
                var url = $("input[name=request_url]").val();
                var method = $("select").val();
                if(geter.length>0){
                    url = url.indexOf('?')>0 ? url+"&"+geter : url+"?"+geter;
                }
                $.ajax({
                    url:url,
                    type:method,
                    data:form,
                    beforeSend: function(xhr){
                        for(var k in headers){
                            xhr.setRequestHeader(k, headers[k]);
                        }
                    },
                    cache: false,
                    processData: false,
                    contentType: false,
                    success:function(res,status,xhr){
                        $("#submit").show();
                        // console.log(xhr);
                        var statu = xhr.status + ' ' + xhr.statusText;
                        var header = xhr.getAllResponseHeaders();
                        var _text = "[object XMLDocument]"==res+"" ? encodeHtml(xhr.responseText):JSON.stringify(res, null, 4);
                        $("#json_output").html('<pre style="white-space:pre-wrap;word-wrap:break-word;">' + statu + '<br/>' + header + '<br/>' + _text + '</pre>');
                    },
                    error:function(error){
                        $("#submit").show();
                        $("#json_output").html("<font color='#f00'>"+JSON.stringify(error)+"</font>");
                        console.log(error)
                    }
                })
            })
            fillHistoryData();
        });
        function encodeHtml(s){
            return s.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
        }
        function fillHistoryData() {
            $("td input").each(function(index,e) {
                var val = getHistory(e.name);
                if (val != "service" && val != "" && val !== undefined) {
                    e.value = val;
                }
            });
        }
        var pageId=location.pathname+location.search;
        var globalVars = {$gvars};
        function getHistory(name){
            if(globalVars && globalVars.indexOf(name)>-1){
                localStorage.getItem(name);
            }
            return localStorage.getItem(pageId+":"+name)
        }
        function setHistory(name,val){
            if(globalVars && globalVars.indexOf(name)>-1){
                localStorage.setItem(name,val);
            }
            localStorage.setItem(pageId+":"+name,val)
        }
    </script>`;