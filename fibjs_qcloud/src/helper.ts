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