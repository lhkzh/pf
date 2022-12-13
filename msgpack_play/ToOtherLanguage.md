**MsgArrayToCsharp**
<pre>
import { MsgArray, MType } from "msgpack_play";
class MsgArrayToCsharp {
    private static SimpleDict = {
        [MType.BOOL]: { type: "bool", default: "false" },
        [MType.I8]: { type: "byte", default: "0" },
        [MType.I16]: { type: "short", default: "0" },
        [MType.I32]: { type: "int", default: "0" },
        [MType.I53]: { type: "long", default: "0" },
        [MType.I64]: { type: "long", default: "0" },
        [MType.F32]: { type: "float", default: "0f" },
        [MType.F64]: { type: "double", default: "0d" },
        [MType.STR]: { type: "string", default: "\"\"" },
        [MType.DATE]: { type: "DateTime" },
    }
    public static generateTo(dir: string) {
        MsgArray.MetaIdList().forEach(id => {
            this.generateById(id, dir);
        });
    }
    public static generateById(id: number, toDir: string) {
        let cmeta = MsgArray.MetaById(id);
        let cs_str = `using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MessagePack;
        
[MessagePackObject]
public class ${cmeta.name}{
`;
        cmeta.fields.forEach((f, i) => {
            let field = f[0];
            let simple = this.SimpleDict[<any>f[1]];
            if (simple) {
                if (f[2] == 0 && simple.default) {
                    cs_str += `    [Key(${i})] public ${simple.type} ${field} = ${simple.default};\n`;
                } else {
                    cs_str += `    [Key(${i})] public ${simple.type} ${field};\n`;
                }
            } else if (Array.isArray(f[1])) {
                let arr = f[1];
                if (arr[0] == "Arr") {
                    let aSimple = this.SimpleDict[<any>arr[1]];
                    if (aSimple) {
                        cs_str += `    [Key(${i})] public List<${aSimple.type}> ${field};\n`;
                    } else {
                        let xType = MsgArray.MetaByClass(<any>arr[1]).name;
                        cs_str += `    [Key(${i})] public List<${xType}> ${field};\n`;
                    }
                } else if (arr[0] == "Set") {
                    let aSimple = this.SimpleDict[<any>arr[1]];
                    if (aSimple) {
                        cs_str += `    [Key(${i})] public HashSet<${aSimple.type}> ${field};\n`;
                    } else {
                        let xType = MsgArray.MetaByClass(<any>arr[1]).name;
                        cs_str += `    [Key(${i})] public HashSet<${xType}> ${field};\n`;
                    }
                } else if (arr[0] == "Obj" || arr[0] == "Map") {
                    let kSimpe = this.SimpleDict[<any>arr[1]];
                    let aSimple = this.SimpleDict[<any>arr[2]];
                    if (aSimple) {
                        cs_str += `    [Key(${i})] public Dictionary<${kSimpe.type}, ${aSimple.type}> ${field};\n`;
                    } else {
                        let xType = MsgArray.MetaByClass(<any>arr[2]).name;
                        cs_str += `    [Key(${i})] public Dictionary<${kSimpe.type}, ${xType}> ${field};\n`;
                    }
                }
            } else if ((<any>f[1])["BYTES_PER_ELEMENT"] > 0) {
                cs_str += `    [Key(${i})] public byte[] ${field};\n`;
            } else {
                let xType = MsgArray.MetaByClass(<any>f[1]).name;
                cs_str += `    [Key(${i})] public ${xType} ${field};\n`;
            }
        });
        cs_str += "}";
        require("fs").writeFile(toDir + cmeta.name + ".cs", cs_str, "utf-8", function (err) { });
    }
}
<pre>