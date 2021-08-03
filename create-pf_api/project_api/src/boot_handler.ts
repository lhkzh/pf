const pf_api = require("pf_api");
const api_dirs = [__dirname+"/api"];
const opts = {
    // static:process.cwd()+"/www",
    // prefix:["/v2/"]
};
//一定要 module.exports
module.exports = pf_api.api_scan.registApiByDir(api_dirs, f=>f.endsWith(".js") && f!=__filename, opts);