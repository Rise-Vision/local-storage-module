const watch = require("./watch");
const db = require("../../db/api");

module.exports = ()=>{
  log.file("Refreshing watched files");
  db.fileMetadata.setAll({status: "UNKNOWN"});
  db.watchlist.allEntries().forEach(watch.process);
}
