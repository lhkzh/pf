function parseSrc(src){
    let arr = src.split("\n");
    let infos = [];
    let in_class = false;
    let in_desc = null;
    let in_note = null;
    for(let i = 0; i < arr.length; i++){
        let line = arr[i].trim();
        if(line.indexOf("//") == 0||line.indexOf("/*") == 0){
            if(!in_note){
                in_note = line;
            }else{
                in_note+=line;
            }
        }else if(line.indexOf("const ") == 0){
            if(!in_class){
                in_class = line.split(" ")[1].replace(/[^A-Za-z0-9_]/g,"").trim();
                in_desc={
                    "name":in_class,
                    "note":in_note||"",
                    "fields":[],
                };
            }else{
                throw new Error("bad_line:"+i+","+line+">"+in_class);
            }
            in_note = null;
        }else if(line.indexOf("}")==0){
            infos.push(in_desc);
            in_class = null;
            in_fieldList = null;
            in_comment = null;
        }else if(line.indexOf(":")>0){
            if(!in_class){
                throw new Error("bad_line:"+i+","+line+">No Class");
            }
            let tmp = line.replace(",","").trim().split(":").map(e=>e.trim());
            if(tmp[0]=="$ID"){
                in_desc.id = Number(tmp[1]);
            }else{
                let name = tmp[0];
                let type = tmp[1];
                let require = 1;
                if(type.indexOf("?")>0){
                    require = 0;
                    type = type.replace("?", "");
                }
                type=type.replace(/"/g,"");
                in_desc.fields.push({
                    name:name,
                    type:type,
                    require:require,
                    note:in_note||""
                });
            }
            in_note = null;
        }
    }
    return infos;
}
exports.parseSrc=parseSrc;