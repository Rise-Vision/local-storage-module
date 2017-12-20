const watch = require("./watch");
const db = require("../../db/api");

module.exports = ()=>{
  log.file("Refreshing watched files");
  db.fileMetadata.setAll({status: "UNKNOWN"});
  db.watch.allEntries.forEach(watch.process);
}
