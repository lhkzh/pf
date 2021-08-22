import { ApiBase } from "./ApiBase";

/**
 * 云函数相关简单封装
 */
export class SCFClient extends ApiBase{

    constructor(protected cfg: { secretId: string, secretKey: string, region?: string/**地域*/ }) {
        super({host:"scf.tencentcloudapi.com", service:"scf",version:"2018-04-16"}, cfg);
    }

    /**
     * 运行函数
     * @param params
     */
    public Invoke(params: { FunctionName: string, ClientContext?: string, InvocationType?: string, Qualifier?: string, LogType?: string, Namespace?: string, RoutingKey?: string }) {
        return this.req_json('POST', "Invoke", {Action: "Invoke", FunctionName: params.FunctionName}, params);
    }

    /**
     * 更新函数代码
     * @param params
     * @constructor
     */
    public UpdateFunctionCode(params: { FunctionName: string, Handler: string, CosBucketName?: string, CosObjectName?: string, CosBucketRegion?: string, ZipFile?: string, Namespace?: string, Publish?: string, EnvId?: string, Code?: ScfCode, CodeSource?: string }) {
        return this.req_json('POST', "UpdateFunctionCode", {
            Action: "UpdateFunctionCode",
            FunctionName: params.FunctionName
        }, params);
    }

    /**
     * 发布函数代码
     * @param params
     * @constructor
     */
    public PublishVersion(params: { FunctionName: string, Description?: string, Namespace?: string }) {
        return this.req_json('POST', "PublishVersion", {
            Action: "PublishVersion",
            FunctionName: params.FunctionName
        }, params);
    }

    /**
     * 查询函数版本
     * @param params
     * @constructor
     */
    public ListVersionByFunction(params: { FunctionName: string, Namespace?: string, Offset?: number, Limit?: number, Order?: string, OrderBy?: string }) {
        return this.req_json('POST', "ListVersionByFunction", {
            Action: "ListVersionByFunction",
            FunctionName: params.FunctionName
        }, params);
    }

    private req_json(reqMethod: string, action: string, query: any, params: any) {
        return this.invoke(reqMethod, action, query, params).json();
    }
}

export interface ScfCode {
    CosBucketName?: string,
    CosObjectName?: string,
    ZipFile?: string,
    CosBucketRegion?: string,
    DemoId?: string,
    TempCosObjectName?: string,

    GitUrl?: string,
    GitUserName?: string,
    GitPassword?: string,
    GitPasswordSecret?: string,
    GitBranch?: string,
    GitDirectory?: string,
    GitCommitId?: string,
    GitUserNameSecret?: string,

}