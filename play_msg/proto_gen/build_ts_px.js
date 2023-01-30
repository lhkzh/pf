const fs=require("fs");
const parseSrc=require("./build_base").parseSrc;
const bases = ["BOOL","I8","I16","I32","I64","I53","F32","F64","STR","DATE"];
const baseMapping = ["boolean","number","number","number","bigint","number","number","number","string","Date"];

function is_privimite_arr(type){
    return "Int8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array".indexOf(type)>-1;
}

function build_ts_encode(info){
    var lines = info.fields.map(e=>{
        let type = e.type.toUpperCase();
        if(e.type.indexOf("_")>0){
            let t = e.type.split("_");
            var t0 = t[0].toLowerCase();
            var t1 = t[1];
            var t2 = t[2];
            if(t0=="arr" || t0=="set"){
                if(bases.indexOf(t1.toUpperCase())>-1){
                    if(e.require){
                        return `        coder.arr(this.${e.name}, stream);`;
                    }else{
                        return `        this.${e.name}!=null ? coder.arr(this.${e.name}, stream) : coder.nil(stream);`;
                    }
                }else{
                    var _rtpl = `        coder.arrSize(this.${e.name}.length, stream);
                    this.${e.name}.forEach((e)=>{ e==null ? coder.nil(stream) : e.pack(coder, stream); });`;
                    if(e.require){
                        return _rtpl;
                    }else{
                        return `        if(this.${e.name}==null){ coder.nil(stream); } else {
${_rtpl}
        }`
                    }
                }
            }else if(t0=="set"){
                if(bases.indexOf(t1.toUpperCase())>-1){
                    if(e.require){
                        return `        coder.set(this.${e.name}, stream);`;
                    }else{
                        return `        this.${e.name}!=null ? coder.set(this.${e.name}, stream) : coder.nil(stream);`;
                    }
                }else{
                    var _rtpl = `        coder.arrSize(this.${e.name}.size, stream);
                    this.${e.name}.forEach((e)=>{ e==null ? coder.nil(stream) : e.pack(coder, stream); });`;
                    if(e.require){
                        return _rtpl;
                    }else{
                        return `        if(this.${e.name}==null){ coder.nil(stream); } else {
${_rtpl}
        }`
                    }
                }
            }else if(t0=="obj"){
                if(bases.indexOf(t2.toUpperCase())>-1){
                    if(e.require){
                        return `        coder.obj(this.${e.name}, stream);`;
                    }else{
                        return `        this.${e.name}!=null ? coder.obj(this.${e.name}, stream) : coder.nil(stream);`;
                    }
                }else{
                    var _entries = `_entries_${e.name}`;
                    var _rtpl = `        var ${_entries} = Object.entries(this.${e.name});
                    coder.mapSize(${_entries}.length, stream);
                    ${_entries}.forEach((k,v)=>{
                        coder.str(k, stream);
                        v!=null ? v.pack(coder, stream) : coder.nil(stream);
                    })`;
                    if(e.require){
                        return _rtpl;
                    }else{
                        return `        if(this.${e.name}==null){ coder.nil(stream); } else {
${_rtpl}
        }`
                    }
                }
            }else if(t0=="map"){
                if(bases.indexOf(t2.toUpperCase())>-1){
                    if(e.require){
                        return `        coder.map(this.${e.name}, stream);`;
                    }else{
                        return `        this.${e.name}!=null ? coder.map(this.${e.name}, stream) : coder.nil(stream);`;
                    }
                }else{
                    var _entries = `_entries_${e.name}`;
                    var _rtpl = `        coder.mapSize(this.${e.name}.size, stream);
        this.${e.name}.forEach((v,k)=>{
            coder.encode(k, stream);
            v!=null ? v.pack(coder, stream) : coder.nil(stream);
        })`;
                    if(e.require){
                        return _rtpl;
                    }else{
                        return `        if(this.${e.name}==null){ coder.nil(stream); } else {
${_rtpl}
        }`
                    }
                }
            }
        }else if(bases.indexOf(type)>-1){
            let bidx = bases.indexOf(type);
            if(bidx==0){
                return `         coder.bool(this.${e.name}, stream);`;
            }else if(bidx==8){
                if(e.require){
                    return `        coder.str(this.${e.name}, stream);`;
                }else{
                    return `        this.${e.name}!=null ? coder.str(this.${e.name}, stream) : coder.nil(stream);`;
                }
            }else if(bidx==9){
                if(e.require){
                    return `        coder.date(this.${e.name}, stream);`;
                }else{
                    return `        this.${e.name}!=null ? coder.date(this.${e.name}, stream) : coder.nil(stream);`;
                }
            }else if(bidx>=6){
                if(e.require){
                    return `        coder.float(this.${e.name}, stream);`;
                }else{
                    return `        coder.float(isNaN(this.${e.name}) ? 0:this.${e.name}, stream);`;
                }
            }else if(bidx!=4){
                if(e.require){
                    return `        coder.int(this.${e.name}, stream);`;
                }else{
                    return `        coder.int(isNaN(this.${e.name}) ? 0:this.${e.name}, stream);`;
                }
            }else{
                if(e.require){
                    return `        coder.int64(this.${e.name}, stream);`;
                }else{
                    return `        coder.int64(this.${e.name}==null ? MsgArray.CastInt64(0):this.${e.name}, stream);`;
                }
            }
        }else{
            if(e.type=="Uint8Array"){
                if(e.require){
                    return `        coder.bin(this.${e.name}, stream);`;
                }else{
                    return `        this.${e.name}!=null ? coder.bin(this.${e.name}, stream) : coder.nil(stream);`;
                }
            }else if(is_privimite_arr(e.type)){
                return `        coder.encode(this.${e.name}, stream);`;
            } else if(e.require){
                return `        this.${e.name}.pack(coder, stream);`;
            }else{
                return `        this.${e.name}!=null ? this.${e.name}.pack(coder, stream) : coder.nil(stream);`;
            }
        }
    });

    return `    pack(coder:Encoder, stream:OutStream){
        ${lines.join("\n")}
    }`
}


function build_ts_meta(info){
let fields = info.fields.map(e=>{
    let type = e.type.toUpperCase();
    if(e.type.indexOf("_")>0){
        let t = e.type.split("_");
        var t0 = t[0].toLowerCase();
        var t1 = t[1];
        var t2 = t[2];
        if(t0=="arr"){
            if(bases.indexOf(t1.toUpperCase())>-1){
                type = `[MtBox.Arr, MtBase.${t1.toUpperCase()}]`;
            }else{
                type = `[MtBox.Arr, ${t1}]`;
            }
        }else if(t0=="set"){
            if(bases.indexOf(t1.toUpperCase())>-1){
                type = `[MtBox.Set, MtBase.${t1.toUpperCase()}]`;
            }else{
                type = `[MtBox.Set, ${t1}]`;
            }
        }else if(t0=="obj"){
            if(bases.indexOf(t2.toUpperCase())>-1){
                type = `[MtBox.Obj, MtBase.${t1.toUpperCase()}, MtBase.${t2.toUpperCase()}]`;
            }else{
                type = `[MtBox.Obj, MtBase.${t1.toUpperCase()}, ${t2}]`;
            }
        }else if(t0=="map"){
            if(bases.indexOf(t2.toUpperCase())>-1){
                type = `[MtBox.Map, MtBase.${t1.toUpperCase()}, MtBase.${t2.toUpperCase()}]`;
            }else{
                type = `[MtBox.Map, MtBase.${t1.toUpperCase()}, ${t2}]`;
            }
        }
    }else if(bases.indexOf(type)>-1){
        type = `MtBase.${type}`;
    }else{
        type = e.type;
    }
    return `["${e.name}", ${type}, ${e.option}]`;
});
return`@MsgArray.Meta({
    id: ${info.id},
    name: "${info.name}",
    fields: [
        ${fields.join(",\n        ")}
    ]
})\n`;
}
function build_ts_class(info, longTo="bigint"){
    let cstNote = s=>{
        if(s.split("\n").length==1 && s.startsWith("//")){   
            return `/**${s.replace("//","")}*/`;
        }
        return s;
    };
    let basesTypes = baseMapping.map(e=>{return e=="bigint"?longTo:e;});
    let header = build_ts_meta(info);
    let fields = info.fields.map(e=>{
        let type = e.type.toUpperCase();
        if(e.type.indexOf("_")>0){
            let t = e.type.split("_");
            var t0 = t[0].toLowerCase();
            var t1 = t[1];
            var t2 = t[2];
            if(t0=="arr"){
                if(bases.indexOf(t1.toUpperCase())>-1){
                    type = `Array<${basesTypes[bases.indexOf(t1.toUpperCase())]}>`;
                }else{
                    type = `Array<${t1}>`;
                }
            }else if(t0=="set"){
                if(bases.indexOf(t1.toUpperCase())>-1){
                    type = `Set<${basesTypes[bases.indexOf(t1.toUpperCase())]}>`;
                }else{
                    type = `Set<${t1}>`;
                }
            }else if(t0=="obj"){
                t1 = basesTypes[bases.indexOf(t1.toUpperCase())];
                if(bases.indexOf(t2.toUpperCase())>-1){
                    t2 = basesTypes[bases.indexOf(t2.toUpperCase())];
                    type = `{ [index:${t1}]: ${t2} }`;
                }else{
                    type = `{ [index:${t1}]: ${t2} }`;
                }
            }else if(t0=="map"){
                t1 = basesTypes[bases.indexOf(t1.toUpperCase())];
                if(bases.indexOf(t2.toUpperCase())>-1){
                    t2 = basesTypes[bases.indexOf(t2.toUpperCase())];
                    type = `Map<${t1}, ${t2}>`;
                }else{
                    type = `Map<${t1}, ${t2}>`;
                }
            }
        }else if(bases.indexOf(type)>-1){
            type = basesTypes[bases.indexOf(type)];
        }else{
            type = e.type;
        }
        let str = `    public ${e.name}: ${type};`;
        if(e.note&&e.note.length){
            str = `    ${cstNote(e.note)}\n${str}`;
        }
        return str;
    });
    let str = header+
`export class ${info.name} extends MsgArray {
    static ToArray: (val: ${info.name}, deep?: number) => any[];
    static FromArray: (arr: any[]) => ${info.name};
    static ToRefArray: (val: ${info.name}) => any[];
    static FromRefArray: (arr: any[]) => ${info.name};

${fields.join("\n")}

${build_ts_encode(info)}
}\n`;
    if(info.note&&info.note.length){
        str = cstNote(info.note)+"\n"+str;
    }
    return str;
}
const src = fs.readFileSync(__dirname+"/t_proto.js",{encoding:"utf-8"});
let typeSrc = `import {  MsgArray, MtBase, MtBox } from "play_msg";\nimport {  Encoder, Decoder, InStream,OutStream } from "play_msgpack";\n\n`+parseSrc(src).map(e=>build_ts_class(e)).join("\n");
fs.writeFileSync(__dirname+"/t_proto.ts",typeSrc,{encoding:"utf-8"});
