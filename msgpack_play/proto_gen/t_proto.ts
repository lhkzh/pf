import {  MsgArray, MType } from "msgpack_play";

/**账号信息*/
@MsgArray.Meta({
    id: 1,
    name: "UserInfo",
    fields: [
        ["uid", MType.I32, 1],
        ["nick", MType.STR, 1],
        ["tags", ["Arr", MType.STR], 0],
        ["sex", MType.I8, 0],
        ["age", MType.I8, 0],
        ["sound", MType.BOOL, 0]
    ]
})
export class UserInfo {
    /**账号ID*/
    public uid: number;
    /**账号名称*/
    public nick: string;
    /**标签*/
    public tags: Array<string>;
    /**性别*/
    public sex: number;
    /**年纪*/
    public age: number;
    /**声音设置*/
    public sound: boolean;
}

/**登录请求*/
@MsgArray.Meta({
    id: 2,
    name: "LoginReq",
    fields: [
        ["userName", MType.STR, 1],
        ["code", MType.STR, 1]
    ]
})
export class LoginReq {
    /**账号*/
    public userName: string;
    /**校验码*/
    public code: string;
}

/**登录响应*/
@MsgArray.Meta({
    id: 3,
    name: "LoginRsp",
    fields: [
        ["code", MType.I16, 1],
        ["msg", MType.STR, 0],
        ["data", UserInfo, 0]
    ]
})
export class LoginRsp {
    /**状态码*/
    public code: number;
    /**状态信息*/
    public msg: string;
    /**用户信息*/
    public data: UserInfo;
}

/**房间*/
@MsgArray.Meta({
    id: 4,
    name: "Room",
    fields: [
        ["rid", MType.I64, 1],
        ["desc", MType.STR, 1],
        ["playing", MType.BOOL, 1],
        ["create", MType.DATE, 1],
        ["players", ["Set", UserInfo], 1],
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
