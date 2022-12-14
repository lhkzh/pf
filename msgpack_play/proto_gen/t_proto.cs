//Dependent library  https://github.com/neuecc/MessagePack-CSharp
using System;
using System.Collections;
using System.Collections.Generic;
using MessagePack;

//账号信息
[MessagePackObject]
public class UserInfo {
    //账号ID
    [Key(0)] public int uid;
    //账号名称
    [Key(1)] public string nick;
    //标签
    [Key(2)] public List<string> tags;
    //性别
    [Key(3)] public byte sex;
    //年纪
    [Key(4)] public byte age;
    //声音设置
    [Key(5)] public boolean sound;
}

//登录请求
[MessagePackObject]
public class LoginReq {
    //账号
    [Key(0)] public string userName;
    //校验码
    [Key(1)] public string code;
}

//登录响应
[MessagePackObject]
public class LoginRsp {
    //状态码
    [Key(0)] public short code;
    //状态信息
    [Key(1)] public string msg;
    //用户信息
    [Key(2)] public UserInfo data;
}

//房间
[MessagePackObject]
public class Room {
    [Key(0)] public long rid;
    [Key(1)] public string desc;
    [Key(2)] public boolean playing;
    [Key(3)] public DateTime create;
    [Key(4)] public HashSet<UserInfo> players;
    [Key(5)] public Dictionary<int, UserInfo> map1;
    [Key(6)] public Dictionary<int, UserInfo> map2;
    [Key(7)] public byte[] log;
}
public class _ID_Map
{
    public static Dictionary<System.Type, int> Type2Id = new Dictionary<System.Type, int>();
    public static Dictionary<int, System.Type> Id2Type = new Dictionary<int, System.Type>();
    public static void Init()
    {
        _ID_Map.Type2Id[typeof(UserInfo)] = 1;
        _ID_Map.Id2Type[1] = typeof(UserInfo);
        _ID_Map.Type2Id[typeof(LoginReq)] = 2;
        _ID_Map.Id2Type[2] = typeof(LoginReq);
        _ID_Map.Type2Id[typeof(LoginRsp)] = 3;
        _ID_Map.Id2Type[3] = typeof(LoginRsp);
        _ID_Map.Type2Id[typeof(Room)] = 4;
        _ID_Map.Id2Type[4] = typeof(Room);
    }
}