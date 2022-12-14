import {  MsgArray, MType } from "msgpack_play";

/**账号信息*/
@MsgArray.Meta({
    id: 1,
    name: "UserInfo",
    fields: [
        ["uid", MType.I32, 0],
        ["nick", MType.STR, 0],
        ["tags", ["Arr", MType.STR], 1],
        ["sex", MType.I8, 1],
        ["age", MType.I8, 1],
        ["sound", MType.BOOL, 1]
    ]
})
export class UserInfo {
    public /**账号ID*/
    public uid: number;
    public /**账号名称*/
    public nick: string;
    public /**标签*/
    public tags: Array<string>;
    public /**性别*/
    public sex: number;
    public /**年纪*/
    public age: number;
    public /**声音设置*/
    public sound: boolean;
}

/**登录请求*/
@MsgArray.Meta({
    id: 2,
    name: "LoginReq",
    fields: [
        ["userName", MType.STR, 0],
        ["code", MType.STR, 0]
    ]
})
export class LoginReq {
    public /**账号*/
    public userName: string;
    public /**校验码*/
    public code: string;
}

/**登录响应*/
@MsgArray.Meta({
    id: 3,
    name: "LoginRsp",
    fields: [
        ["code", MType.I16, 0],
        ["msg", MType.STR, 1],
        ["data", UserInfo, 1]
    ]
})
export class LoginRsp {
    public /**状态码*/
    public code: number;
    public /**状态信息*/
    public msg: string;
    public /**用户信息*/
    public data: UserInfo;
}

/**房间*/
@MsgArray.Meta({
    id: 4,
    name: "Room",
    fields: [
        ["rid", MType.I64, 0],
        ["desc", MType.STR, 0],
        ["playing", MType.BOOL, 0],
        ["create", MType.DATE, 0],
        ["players", ["Set", UserInfo], 0],
        ["map1", ["Obj", MType.I32, UserInfo], 0],
        ["map2", ["Map", MType.I32, UserInfo], 0],
        ["log", Int8Array, 0]
    ]
})
export class Room {
    public rid: bigint;
    public desc: string;
    public playing: boolean;
    public create: Date;
    public players: Set<UserInfo>;
    public map1: {[index:number]: UserInfo};
    public map2: Map<number, UserInfo>;
    public log: Int8Array;
}
