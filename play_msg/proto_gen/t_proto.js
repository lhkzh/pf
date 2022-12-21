//账号信息
const UserInfo={
    $ID: 1,
    //账号ID
    uid: "i32",
    //账号名称
    nick:"str",
    //标签
    tags:"arr_str?",
    //性别
    sex:"i8?",
    //年纪
    age:"i8?",
    //声音设置
    sound:"bool?"
}
//登录请求
const LoginReq={
    $ID:2,
    //账号
    userName:"str",
    //校验码
    code:"str",
}
//登录响应
const LoginRsp={
    $ID:3,
    //状态码
    code:"i16",
    //状态信息
    msg:"str?",
    //用户信息
    data:"UserInfo?"
}
//房间
const Room={
    $ID:4,
    rid:"i64",
    desc:"str",
    playing:"bool",
    create:"date",
    players:"set_UserInfo",
    map1:"obj_i32_UserInfo?",
    map2:"map_i32_UserInfo?",
    log:"Uint8Array?"
}
//位置数据
const MoveAction={
    $ID:5,
    uid:"i32",
    path:"Float32Array"
}