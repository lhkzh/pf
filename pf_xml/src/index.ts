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
            let val: string | number = String(child.childNodes[0].nodeValue);
            if (child.childNodes[0].nodeType == 3) {
                let nv = Number(val);
                if (Number.isFinite(nv)) {
                    val = nv;
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
            V[K] = val;
            return true;
        }
    }
    return false;
}