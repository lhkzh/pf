/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
import * as xml from "xml";
import * as util from "util";

/**
 * 基于fibjs的xml与json互转简单实现，只能基于节点不能用attr
 */

export const xml_field_attr = "@attributes";

interface opts_xml2json {
    root?: boolean,//是否保留根节点
    attr?: boolean,//是否解析属性
    parse?: {//是否自动解析数据类型
        bigint?: boolean,//解析数字时，遇到超大整数是否开启bigint（不开启返回string=不解析避免丢失精度）
        length?: number,//解析数字时，合法数字长度（比如默认19位，超过不解析）
        date?: boolean,//是否解析日期, Date.parse支持的字符串都会被解析
    }
}

/**
 * 将xml字符串转成标准js_object
 * @param xmlStr
 * @param opts
 */
export function xml2json(xmlStr: string, opts: opts_xml2json = {}): { [index: string]: any } {
    var doc = xml.parse(xmlStr).documentElement;
    var ret = parseXmlList(doc.childNodes, opts);
    if (opts.root) {
        var wrap = {};
        wrap[doc.nodeName] = ret;
        ret = wrap;
    }
    let attrs = parseAttrData(ret, doc, opts);
    if (attrs) {
        ret[xml_field_attr] = attrs;
    }
    return ret;
}

function parseAttrData(retData: any, doc: Class_XmlElement, opts: opts_xml2json) {
    if (opts.attr && doc.attributes && doc.attributes.length > 0) {
        let attrs = {};
        for (var i = 0; i < doc.attributes.length; i++) {
            let attr = doc.attributes[i];
            if (attr.nodeName.startsWith("data-")) {
                attrs[attr.nodeName.substring(5)] = parseXmlData(attr.nodeValue, opts);
            } else {
                attrs[attr.nodeName] = parseXmlData(attr.nodeValue, opts);
            }
        }
        return attrs;
    }
    return null;
}

const NumRegexp = /^((-)?([0-9]+)(([\.\,]{0,1})([0-9]+))?$)/;

function parseXmlData(v: string, opts: opts_xml2json) {
    if (v == null) {
        return "";
    }
    if (!opts.parse) {
        return v;
    }
    if (v == "null") {
        return null;
    } else if (v == "true") {
        return true;
    } else if (v == "false") {
        return false;
    }
    if (opts.parse.date) {
        let n = Date.parse(v);
        if (isNaN(n)) {
            return new Date(n);
        }
    }
    if (v.length <= (opts.parse.length || 19) && NumRegexp.test(v)) {
        var n = Number(v);
        if (Number.isFinite(n)) {
            if (v.indexOf('.') < 0 && Number.isSafeInteger(n) == false) {
                if (!opts.parse.bigint) {
                    return v;
                }
                n = global["BigInt"](v);
            }
            return n;
        }
    }
    return v;
}

function parseXmlList(list: Class_XmlNodeList, opts: opts_xml2json) {
    var ret = {};
    if (list.length == 0) {
        return ret;
    }
    var first = list.item(0);
    if (list.length == 1 && (first.nodeType == 4 || first.nodeType == 3)) {
        return parseXmlData(first.nodeValue, opts);
    }
    for (var i = 0; i < list.length; i++) {
        var child = list.item(i),
            k = child.nodeName,
            v = child.hasChildNodes() ? parseXmlList(child.childNodes, opts) : parseXmlData(child.nodeValue, opts);
        let attrs = parseAttrData(ret, <Class_XmlElement>child, opts);
        if (attrs) {
            if (util.isObject(v)) {
                v[xml_field_attr] = attrs;
            } else {
                let tmp_v = {};
                tmp_v[xml_field_attr] = attrs;
                if (v == "")
                    v = tmp_v;
                else {
                    tmp_v[""] = v;
                    v = tmp_v;
                }
            }
        }
        if (Reflect.has(ret, k)) {
            if (Array.isArray(ret[k])) {
                ret[k].push(v);
            } else {
                ret[k] = [ret[k], v];
            }
        } else {
            ret[k] = v;
        }
    }
    return ret;
}

/**
 * 将标准js_object转xml字符串
 * @param jsObj
 * @param pretty
 * @param root
 */
export function json2xml(jsObj: any, pretty?: boolean, root = "xml") {
    var attrs = "";
    if (util.isDate(jsObj)) {
        jsObj = date_time(jsObj);
    } else if (util.isObject(jsObj)) {
        attrs = getObjAttr(jsObj) || attrs;
        delete jsObj[xml_field_attr];
        jsObj = obj2xml(jsObj, root, pretty ? 1 : 0, Array.isArray(jsObj));
    } else if (Number.isFinite(jsObj)) {
        jsObj = String(jsObj);
    } else if (typeof jsObj == "bigint") {
        jsObj = String(jsObj);
    } else {
        jsObj = encodeCdata(String(jsObj));
    }
    return ["<?xml version='1.0' encoding='utf-8'?>", "<", root, attrs, ">", jsObj, "</", root, ">"].join("");
}

function encodeCdata(s: string) {
    if (s.length > 1) {
        let s1 = s.replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        if (s1.length != s.length) {
            s = "<![CDATA[" + s1 + "]]>";
        }
    }
    return s;
}

function getObjAttr(d: any) {
    var attrs;
    if (d.hasOwnProperty(xml_field_attr)) {
        Object.entries(d[xml_field_attr]).forEach(e => {
            if (!attrs) {
                attrs = [""];
            }
            attrs.push(e[0] + "=\"" + e[1] + "\"");
        });
        if (attrs) {
            attrs = attrs.join(" ");
        }
        if (util.isDate(d)) {
            d = date_time(d);
        } else if (Number.isFinite(d)) {
            d = String(d);
        } else if (typeof d == "bigint") {
            d = String(d);
        } else if (util.isString(d)) {
            d = encodeCdata(d);
        }
    }
    return attrs;
}

function obj2xml(d, parent = "xml", idx, isarr) {
    var subs = [], attrs = "";
    for (var k in d) {
        var v = d[k];
        if (util.isDate(v)) {
            v = date_time(v);
        } else if (util.isObject(v)) {
            attrs = getObjAttr(v) || attrs;
            delete v[xml_field_attr];
            if (Array.isArray(v)) {
                subs.push(obj2xml(v, k, idx ? idx + 1 : idx, true));
                continue;
            } else {
                v = obj2xml(v, k, idx ? idx + 1 : idx, false);
            }
        } else if (Number.isFinite(v)) {
            v = String(v);
        } else if (typeof v == "bigint") {
            v = String(v);
        } else {
            v = encodeCdata(String(v));
        }
        k = isarr ? parent : k;
        if (k.length == 0 && attrs.length == 0) {
            subs.push(line(idx), space(idx), attrs, v);
        } else {
            subs.push(line(idx), space(idx), "<", k, attrs, ">", v, "</", k, ">");
        }
        attrs = "";
    }
    return subs.join("") + line(idx);
}

function date_time(v) {
    return v.getFullYear() + "-" + t2(v.getMonth() + 1) + "-" + t2(v.getDate()) + " " + t2(v.getHours()) + ":" + t2(v.getMinutes()) + ":" + t2(v.getSeconds())
}

function t2(n) {
    return n > 9 ? n : "0" + n;
}

function space(idx) {
    if (idx < 1) {
        return "";
    }
    return "  ".repeat(idx);
}

function line(idx) {
    if (idx < 1) return "";
    return "\n";
}