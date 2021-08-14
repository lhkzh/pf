import * as ssl from "ssl";
import * as xml from "xml";
import * as util from "util";

ssl.loadRootCerts();

export interface CacheObj {
    get(k: string): string;

    set(k: string, v: string, ttl: number);

    del(k: string);
}

/**
 * 进程内-内存缓存
 */
class MemCacheObj implements CacheObj {
    private cache: Map<string, { v: any, t: number }>;
    private timer: Class_Timer;

    constructor() {
        this.cache = new Map<string, { v: any; t: number }>();
        this.ttl = this.ttl.bind(this);

    }

    private ttl(is_del: boolean) {
        if (is_del) {
            if (this.cache.size > 0) {
                return;
            }
        }
        clearTimeout(this.timer);
        let now = Date.now();
        this.cache.forEach((e, k) => {
            if (e.t < now) {
                this.cache.delete(k);
            }
        });
        if (this.cache.size) {
            this.timer = setTimeout(this.ttl, 2000);
        } else {
            this.timer = null;
        }
    }

    private startTtl() {
        if (!this.timer) {
            this.timer = setTimeout(this.ttl, 2000);
        }
    }

    public get(k: string): string {
        let r = this.cache.get(k);
        if (r) {
            if (r.t > Date.now()) {
                this.del(k);
            } else {
                return r.v;
            }
        }
        return null;
    }

    public set(k: string, v: string, ttl: number) {
        let r = {v: v, t: Date.now() + ttl * 1000};
        this.cache.set(k, r);
        if (this.cache.size == 1) {
            this.startTtl();
        }
    }

    public del(k: string) {
        this.cache.delete(k) && this.ttl(true);
    }

    public destory() {
        this.cache = null;
        clearTimeout(this.timer);
    }
}

let cache_global_tmp_key = "$_pf_wx_cache:" + __filename;
let cacheObj: CacheObj = global[cache_global_tmp_key] || new MemCacheObj();

/**
 * 设置缓存客户端
 * @param obj
 */
export function setCacheHandler(obj: CacheObj) {
    if (!obj) {
        return;
    }
    if (cacheObj instanceof MemCacheObj) {
        (<MemCacheObj>cacheObj).destory();
        delete global[cache_global_tmp_key];
    }
    cacheObj = obj;
}

export function getCacheHandler() {
    return cacheObj;
}

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