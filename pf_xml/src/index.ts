/// <reference types="@fibjs/types" />
import * as xml from "xml";

/**
 * json对象转xml，微信接口用的通信样式，无属性的
 * @param data
 */
export function objToXmlNoAttr(data: any) {
    if(typeof data=="object"){
        return `<xml>${to_xml_of_obj(data).join("")}</xml>`;
    }
    return `<xml>${data}</xml>`;
}

function to_xml_of_obj(obj: any) {
    let list = [];
    for (let k in obj) {
        if (obj[k] === null || obj[k] === undefined) {
            continue;
        }
        if (Number.isFinite(obj[k])) {
            list.push(`<${k}>${obj[k]}</${k}>`);
        } else {
            if (Array.isArray(obj[k])) {
                list.push(to_xml_of_arr(obj[k], k).join(""));
            } else {
                list.push(`<${k}><![CDATA[${obj[k]}]]></${k}>`);
            }
        }
    }
    return list;
}

function to_xml_of_arr(arr: Array<any>, pk: string) {
    let list = [];
    arr.forEach(e => {
        if (typeof e == "object") {
            list.push(to_xml_of_obj(e).join(""));
        } else {
            if (Number.isFinite(e)) {
                list.push(`<${pk}>${e}</${pk}>`);
            } else {
                list.push(`<${pk}><![CDATA[${e}]]></${pk}>`);
            }
        }
    });
    return list;
}

/**
 * xml解析为json，微信接口用的通信样式，无属性的
 * @param xmlStr
 */
export function xmlToObjNoAttr(xmlStr: string) {
    let rsp: { [index: string]: number | string } = {};
    let doc = xml.parse(xmlStr).documentElement;
    for (let i = 0; i < doc.childNodes.length; i++) {
        let child = doc.childNodes.item(i);
        get_xml_child_val(child, child.nodeName, rsp);
    }
    return rsp;
}

function get_xml_child_val(child: Class_XmlNode, K: any, V: any | Array<any>) {
    if (child.nodeType == 1) {
        if (child.childNodes.length == 1) {
            let val: string | number | boolean = String(child.childNodes[0].nodeValue);
            if (child.childNodes[0].nodeType == 3) {
                let nv = Number(val);
                if (Number.isFinite(nv)) {
                    val = nv;
                } else if(val == "true" || val == "false"){
                    val = Boolean(val);
                } else if(val.length > 2 && val[0] == '"' && val.charAt(val.length-1) == '"'){
                    val = val.substr(1, val.length-2);
                }
            }
            V[K] = val;
            return true;
        } else if (child.childNodes.length > 1) {
            let val = [], _vc = {};
            for (let j = 0; j < child.childNodes.length; j++) {
                if (get_xml_child_val(child.childNodes[j], child.childNodes[j].nodeName, _vc)) {
                    val.push(_vc);
                    _vc = {};
                }
            }
            val = sub_rows_to_obj(val);
            if(V.hasOwnProperty(K)){
                if(!Array.isArray(V[K])){
                    V[K] = [V[K], val];
                } else {
                    V[K].push(val);
                }
            } else {
                V[K] = [val];
            }
            return true;
        }
    }
    return false;
}
function sub_rows_to_obj(arr_sub_objs){
    if(arr_sub_objs.some(e=>Object.keys(e).length>1)==false){
        var r = {};
        for(var i=0;i<arr_sub_objs.length;i++){
            for(let [k,v] of Object.entries(arr_sub_objs[i])){
                r[k] = v;
            }
        }
        return r;
    }
    return arr_sub_objs;
}

/**
 * 匹配 xml 标签对
 * 微信的数据目前仅简单标签对形式
 */
const RE_FIELD = /<(\w+)>([\s\S]*?)<\/\1>/g;
/**
 * 解析 xml 数据
 * @param xml 数据
 */
export function xmlToObjSimple(xml:string, toArrayFields:string[]=[]) {
    const items = []; // 存储字段匹配结果
    if (!RE_FIELD.test(xml)) {
        return xml.replace(/<!\[CDATA\[(.*)\]\]>/, '$1');
    }
    xml.replace(RE_FIELD, (m, field, value) => {
        items.push({ field, value: xmlToObjSimple(value, toArrayFields) });
        return m;
    });
    const keys = items.map(({ field }) => field);
    const isArray = keys.length > 1 && [...new Set(keys)].length === 1;
    const target = {};
    if (isArray) {
        const arr = [];
        target[items[0].field] = arr;
        items.forEach((it) => arr.push(it.value));
    }
    else {
        items.forEach((it) => {
            if(target.hasOwnProperty(it.field) || toArrayFields.includes(it.field)){
                if(Array.isArray(target[it.field])){
                    target[it.field].push(it.value);
                } else if(target.hasOwnProperty(it.field)){
                    target[it.field]=[target[it.field], it.value];
                } else {
                    target[it.field]=[it.value];
                }
            } else {
                target[it.field] = it.value;
            }
        });
    }
    return target;
}