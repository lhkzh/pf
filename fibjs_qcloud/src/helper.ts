import * as os from "os";
import * as hash from "hash";


export function sigHmacSha1(secret:string|Class_Buffer, data:string|Class_Buffer, codec:string="hex"){
    return hash.hmac_sha1(<any>secret, <any>data).digest(codec);
}
export function sigHmacSha256(secret:string|Class_Buffer, data:string|Class_Buffer, codec:string="hex"){
    return hash.hmac_sha256(<any>secret, <any>data).digest(codec);
}
//TC3-HMAC-SHA256
export function sigTc3HmacSha256(secret:string|Class_Buffer, date:string, service:string, data:string|Class_Buffer){
    let kDate = sigHmacSha256('TC3' + secret,date, "buffer")
    let kService = sigHmacSha256(kDate, service,"buffer")
    let kSigning = sigHmacSha256(kService,'tc3_request',"buffer")
    let signature = sigHmacSha256( kSigning, data,'hex');
    return signature;
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