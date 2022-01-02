
var argvs = process.argv;
if(argvs.length==5 && argvs[2]=="-i"){// node cli.js -i xxx.d.ts xxx.json
    var source = require("fs").readFileSync(argvs[3],"utf8");
    var protocol = require("./MsgAst").MsgAst.parse(source);

    require("fs").writeFileSync(argvs[4],JSON.stringify(protocol,null,2),"utf8");
    console.log("ok");
}else{
    console.log("arg-err");
}