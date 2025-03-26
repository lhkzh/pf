//账号信息
const UserInfo = {
  $ID: 1,
  //账号ID
  uid: "int",
  //账号名称
  nick: "str",
  //标签
  tags: "arr>str?",
  //性别
  sex: "byte?",
  //年纪
  age: "byte?",
  //声音设置
  sound: "bool?",
};
//登录请求
const LoginReq = {
  $ID: 2,
  //账号
  userName: "str",
  //校验码
  code: "str",
};
//登录响应
const LoginRsp = {
  $ID: 3,
  //状态码
  code: "short",
  //状态信息
  msg: "str?",
  //用户信息
  data: "UserInfo?",
};
//房间
const Room = {
  $ID: 4,
  rid: "long",
  desc: "str",
  playing: "bool",
  create: "date",
  players: "set>UserInfo",
  map1: "obj>int>UserInfo?",
  map2: "map>int>UserInfo?",
  log: "Uint8Array?",
  // posArr: "arr>Vector3?",
};
//位置数据
const MoveAction = {
  $ID: 5,
  uid: "int",
  path: "Float32Array",
};
