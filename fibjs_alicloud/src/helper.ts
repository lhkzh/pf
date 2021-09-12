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