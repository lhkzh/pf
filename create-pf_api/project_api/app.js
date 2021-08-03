const pf_api = require("pf_api");
const api_dirs = [__dirname+"/dist"];
const server = pf_api.newWebServer(false, {
    worker: __dirname+"/dist/boot_handler.js",
    port: 9080,
    mods: {pf_api: pf_api, "fibjs_server": require("fibjs_server")}
});
server.watchReload(api_dirs);
server.start();
console.log("docs at => http://localhost:"+server.port+"/docs");