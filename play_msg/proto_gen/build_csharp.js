const fs = require("fs");
const parseSrc = require("./build_base").parseSrc;
const bases = [
  "BOOL",
  "BYTE",
  "SHORT",
  "INT",
  "LONG",
  "I53",
  "FLOAT",
  "DOUBLE",
  "STR",
  "DATE",
  "Int8Array",
  "Uint8Array",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
].map((e) => e.toUpperCase());
const basesTypes = [
  "bool",
  "byte",
  "short",
  "int",
  "long",
  "long",
  "float",
  "double",
  "string",
  "DateTime",
  "SByte[]",
  "byte[]",
  "Int16[]",
  "UInt16[]",
  "Int32[]",
  "UInt32[]",
  "Single[]",
  "Double[]",
  "Int64[]",
  "UInt64[]",
];

function build_cs_class(info) {
  let fields = info.fields.map((e, i) => {
    let type = e.type.toUpperCase();
    if (e.type.indexOf(">") > 0) {
      let t = e.type.split(">");
      var t0 = t[0].toLowerCase();
      var t1 = t[1];
      var t2 = t[2];
      if (t0 == "arr") {
        if (bases.indexOf(t1.toUpperCase()) > -1) {
          type = `List<${basesTypes[bases.indexOf(t1.toUpperCase())]}>`;
        } else {
          type = `List<${t1}>`;
        }
      } else if (t0 == "set") {
        if (bases.indexOf(t1.toUpperCase()) > -1) {
          type = `HashSet<${basesTypes[bases.indexOf(t1.toUpperCase())]}>`;
        } else {
          type = `HashSet<${t1}>`;
        }
      } else if (t0 == "map" || t0 == "obj") {
        t1 = basesTypes[bases.indexOf(t1.toUpperCase())];
        if (bases.indexOf(t2.toUpperCase()) > -1) {
          t2 = basesTypes[bases.indexOf(t2.toUpperCase())];
          type = `Dictionary<${t1}, ${t2}>`;
        } else {
          type = `Dictionary<${t1}, ${t2}>`;
        }
      }
    } else if (bases.indexOf(type) > -1) {
      type = basesTypes[bases.indexOf(type)];
    } else {
      type = e.type;
    }
    let str = `    [Key(${i})] public ${type} ${e.name};`;
    if (e.note && e.note.length) {
      str = `    ${e.note}\n${str}`;
    }
    return str;
  });
  let str = `[MessagePackObject]\npublic class ${info.name} {
${fields.join("\n")}
}\n`;
  if (info.note && info.note.length) {
    str = info.note + "\n" + str;
  }
  return str;
}

function build_cs_idmap(list) {
  let mstr = list
    .map((e) => {
      return `        Regist(${e.name},${e.id});`;
    })
    .join("\n");
  return `public class _ID_Map
{
    public static Dictionary<System.Type, int> Type2Id = new Dictionary<System.Type, int>();
    public static Dictionary<int, System.Type> Id2Type = new Dictionary<int, System.Type>();
    private static void Regist(System.Type type, int id){
        _ID_Map.Type2Id[type] = id;
        _ID_Map.Id2Type[id] = type;
    }
    public static void Init()
    {
${mstr}
    }
}`;
}

const src = fs.readFileSync(__dirname + "/t_proto.js", { encoding: "utf-8" });
const typeList = parseSrc(src);
let typeSrc =
  "//Dependent library  https://github.com/neuecc/MessagePack-CSharp \n";
typeSrc +=
  "using System;\nusing System.Collections;\nusing System.Collections.Generic;\nusing MessagePack;\n\n";
typeSrc += typeList.map((e) => build_cs_class(e)).join("\n");
typeSrc += build_cs_idmap(typeList);

fs.writeFileSync(__dirname + "/t_proto.cs", typeSrc, { encoding: "utf-8" });
