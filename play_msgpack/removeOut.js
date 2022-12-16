
/**
 * @caption 删除本地文件夹/文件
 * @param {String} directoryPath 例： d://x/x/x.json 或者 d://x/x/x
 * *@param {Function} callback 例：回调
 */
 let _deleteDir = (directoryPath, callback) => {
    const fs = require('fs').promises;
    async function rmdirAsync (directoryPath) {
      try {
        let stat = await fs.stat(directoryPath)
        if (stat.isFile()) {
          await fs.unlink(directoryPath)
        } else {
          let dirs = await fs.readdir(directoryPath)
          // 递归删除文件夹内容(文件/文件夹)
          dirs = dirs.map(dir => rmdirAsync(require("path").join(directoryPath, dir)))
          await Promise.all(dirs)
          await fs.rmdir(directoryPath)
        }
      } catch (e) {
        console.error(e);
      }
    }
    require('fs').existsSync(directoryPath) && rmdirAsync(directoryPath).then(() => {
        // 确保文件/文件夹均已删除 => 回调
      callback && callback();
    })
  }
  
  _deleteDir("dist/");
//   _deleteDir("build/");
  _deleteDir("lib/");