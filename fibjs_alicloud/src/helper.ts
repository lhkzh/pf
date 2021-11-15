import * as os from "os";
import * as hash from "hash";
import * as uuid from "uuid";

export function sig(secret: string, stringToSign: string, codec: string = "base64") {
    return hash.hmac_sha1(<any>secret, <any>stringToSign).digest(codec);
}

export function makeNonce() {
    return uuid.random().toString("hex");
}

export function utc_timestamp() {
    let date = new Date();
    let YYYY = date.getUTCFullYear();
    let MM = pad2i(date.getUTCMonth() + 1);
    let DD = pad2i(date.getUTCDate());
    let HH = pad2i(date.getUTCHours());
    let mm = pad2i(date.getUTCMinutes());
    let ss = pad2i(date.getUTCSeconds());
    // 删除掉毫秒部分
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}Z`;
}
function pad2i(n:number){
    if(n>9){
        return n;
    }
    return `0${n}`;
}
const pkg = require('../package.json');
export const DEFAULT_UA = `AlibabaCloud (${os.platform()}; ${os.arch()}) ` +
    `fibjs/${process.version} Core/${pkg.version}`;
export const DEFAULT_CLIENT = `fibjs(${process.version}), ${pkg.name}: ${pkg.version}`;

/**
 * 匹配 xml 标签对
 * 微信的数据目前仅简单标签对形式
 */
const RE_FIELD = /<(\w+)>([\s\S]*?)<\/\1>/g;
/**
 * 解析 xml 数据
 * @param xml 数据
 */
export function parseXML(xml:string, toArrFields:string[]=[]) {
    const items = []; // 存储字段匹配结果
    if (!RE_FIELD.test(xml)) {
        return xml.replace(/<!\[CDATA\[(.*)\]\]>/, '$1');
    }
    xml.replace(RE_FIELD, (m, field, value) => {
        items.push({ field, value: parseXML(value, toArrFields) });
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
            if(target.hasOwnProperty(it.field) || toArrFields.includes(it.field)){
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