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
];
const baseMapping = [
  "boolean",
  "number",
  "number",
  "number",
  "bigint",
  "number",
  "number",
  "number",
  "string",
  "Date",
];

function build_field_meta(e) {
  let type = e.type.toUpperCase();
  if (e.type.indexOf(">") > 0) {
    let t = e.type.split(">");
    var t0 = t[0].toLowerCase();
    var t1 = t[1];
    var t2 = t[2];
    if (t0 == "arr") {
      if (bases.indexOf(t1.toUpperCase()) > -1) {
        type = `[MT.ARR, MT.${t1.toUpperCase()}]`;
      } else {
        type = `[MT.ARR, ${t1}]`;
      }
    } else if (t0 == "set") {
      if (bases.indexOf(t1.toUpperCase()) > -1) {
        type = `[MT.SET, MT.${t1.toUpperCase()}]`;
      } else {
        type = `[MT.SET, ${t1}]`;
      }
    } else if (t0 == "obj") {
      if (bases.indexOf(t2.toUpperCase()) > -1) {
        type = `[MT.OBJ, MT.${t1.toUpperCase()}, MT.${t2.toUpperCase()}]`;
      } else {
        type = `[MT.OBJ, MT.${t1.toUpperCase()}, ${t2}]`;
      }
    } else if (t0 == "map") {
      if (bases.indexOf(t2.toUpperCase()) > -1) {
        type = `[MT.MAP, MT.${t1.toUpperCase()}, MT.${t2.toUpperCase()}]`;
      } else {
        type = `[MT.MAP, MT.${t1.toUpperCase()}, ${t2}]`;
      }
    }
  } else if (bases.indexOf(type) > -1) {
    type = `MT.${type}`;
  } else {
    type = e.type;
  }
  return `@MsgField(${type}, ${e.require})`;
}
function build_ts_class(info, longTo = "bigint") {
  let cstNote = (s) => {
    if (s.split("\n").length == 1 && s.startsWith("//")) {
      return `/**${s.replace("//", "")}*/`;
    }
    return s;
  };
  let basesTypes = baseMapping.map((e) => {
    return e == "bigint" ? longTo : e;
  });
  let header = `@MsgClass(${info.id})\n`;
  let fields = info.fields.map((e) => {
    let type = e.type.toUpperCase();
    if (e.type.indexOf(">") > 0) {
      let t = e.type.split(">");
      var t0 = t[0].toLowerCase();
      var t1 = t[1];
      var t2 = t[2];
      if (t0 == "arr") {
        if (bases.indexOf(t1.toUpperCase()) > -1) {
          type = `Array<${basesTypes[bases.indexOf(t1.toUpperCase())]}>`;
        } else {
          type = `Array<${t1}>`;
        }
      } else if (t0 == "set") {
        if (bases.indexOf(t1.toUpperCase()) > -1) {
          type = `Set<${basesTypes[bases.indexOf(t1.toUpperCase())]}>`;
        } else {
          type = `Set<${t1}>`;
        }
      } else if (t0 == "obj") {
        t1 = basesTypes[bases.indexOf(t1.toUpperCase())];
        if (bases.indexOf(t2.toUpperCase()) > -1) {
          t2 = basesTypes[bases.indexOf(t2.toUpperCase())];
          type = `{ [index:${t1}]: ${t2} }`;
        } else {
          type = `{ [index:${t1}]: ${t2} }`;
        }
      } else if (t0 == "map") {
        t1 = basesTypes[bases.indexOf(t1.toUpperCase())];
        if (bases.indexOf(t2.toUpperCase()) > -1) {
          t2 = basesTypes[bases.indexOf(t2.toUpperCase())];
          type = `Map<${t1}, ${t2}>`;
        } else {
          type = `Map<${t1}, ${t2}>`;
        }
      }
    } else if (bases.indexOf(type) > -1) {
      type = basesTypes[bases.indexOf(type)];
    } else {
      type = e.type;
    }
    let str = `    ${build_field_meta(e)}\n    public ${e.name}: ${type};`;
    if (e.note && e.note.length) {
      str = `    ${cstNote(e.note)}\n${str}`;
    }
    return str;
  });
  let str =
    header +
    `export class ${info.name} {
    static ToArray: (val: ${info.name}, deep?: number) => any[];
    static FromArray: (arr: any[]) => ${info.name};
    static ToRefArray: (val: ${info.name}) => any[];
    static FromRefArray: (arr: any[]) => ${info.name};

${fields.join("\n")}
}\n`;
  if (info.note && info.note.length) {
    str = cstNote(info.note) + "\n" + str;
  }
  return str;
}
const src = fs.readFileSync(__dirname + "/t_proto.js", { encoding: "utf-8" });
let typeSrc =
  `import {  MsgClass, MsgField, MsgArray, MT } from "play_msg";\n\n` +
  parseSrc(src)
    .map((e) => build_ts_class(e))
    .join("\n");
fs.writeFileSync(__dirname + "/t_proto.ts", typeSrc, { encoding: "utf-8" });
