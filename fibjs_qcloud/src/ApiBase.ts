import * as hash from "hash";
import * as querystring from "querystring";
import * as http from "http";
import {sigTc3HmacSha256} from "./helper";

export class ApiBase{

    protected service: string;
    protected version: string;
    protected uri: string;
    protected host: string;

    constructor(base:{host:string, service:string, version:string}, protected cfg: { secretId: string, secretKey: string, region?: string/**地域*/ }) {
        this.service = base.service;
        this.version = base.version;
        this.host = base.host;
        if (cfg.region && cfg.region.length > 0) {
            let arr = base.host.split(".");
            arr.splice(1,0,cfg.region);
            this.host = arr.join(".");
        }
        this.uri = this.host.startsWith("http")==false ? "https://" + this.host : this.host;
    }

    public call(reqMethod: string, action: string, query: any, params: any, extHeaders:any={}){
        let date = new Date();
        let timeStamp = Math.round(date.getTime() / 1000);
        let timeDate = date.getUTCFullYear() + '-' + (date.getUTCMonth() > 8 ? '' : '0') + (date.getUTCMonth() + 1) + '-' + (date.getUTCDate() > 9 ? '' : '0') + date.getUTCDate();
        let headers = {
            "Host": this.host,
            "X-TC-Action": action,
            "X-TC-RequestClient": "SDK_fibjs_1.0.0",
            "X-TC-Timestamp": timeStamp,
            "X-TC-Version": this.version,
            "Content-Type": "application/json",
            ...extHeaders
        };
        if (this.cfg.region) {
            headers["X-TC-Region"] = this.cfg.region;
        }
        let payload = JSON.stringify(params);
        let payloadHash = hash.sha256(<any>payload).digest("hex");
        let canonicalHeaders = "content-type:" + headers["Content-Type"] + "\n" +
            "host:" + headers["Host"] + "\n";
        let signedHeaders = "content-type;host";

        if(!query){
            query={};
        }
        if(!query.hasOwnProperty("Action")){
            query.Action =  action;
        }

        let canonicalUri = '/';
        let canonicalQueryString = querystring.stringify(query);
        let canonicalRequest = reqMethod + "\n" +
            canonicalUri + "\n" +
            canonicalQueryString + "\n" +
            canonicalHeaders + "\n" +
            signedHeaders + "\n" +
            payloadHash;

        let algo = "TC3-HMAC-SHA256";
        let service = this.service;
        let credentialScope = timeDate + "/" + service + "/tc3_request";
        let hashedCanonicalRequest = hash.sha256(<any>canonicalRequest).digest("hex");
        let str2sign = algo + "\n" +
            headers["X-TC-Timestamp"] + "\n" +
            credentialScope + "\n" +
            hashedCanonicalRequest;

        let signature = sigTc3HmacSha256(this.cfg.secretKey, timeDate, service, str2sign);
        let auth = algo +
            " Credential=" + this.cfg.secretId + "/" + credentialScope +
            ", SignedHeaders=content-type;host, Signature=" + signature;
        headers["Authorization"] = auth;
        return http.request(reqMethod, this.uri + canonicalUri, {query: query, headers: headers, body: payload});
    }
}