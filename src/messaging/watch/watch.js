const db = require("../../db/api");
const entry = require("./entry");
const messaging = require("../messaging");

module.exports = {
  process(message) {
    const {data, from} = message;

    if (!entry.validate({filePath: data.filePath, owner: from})) {
      return Promise.reject("Invalid watch message");
    }

    const isWatched = db.watchlist.get(data.filePath);
    const status = db.fileMetadata.get(data.filePath, "status");

    if (!isWatched) {
      if (!status) {
        // TODO: file is new
      } else if (status === "UNKNOWN") {
        // TODO: file exists but not being watched
      }
    } else {
      // status is known and file is being watched
      db.owners.put({filePath: data.filePath, owner: from})
        .then(()=>{
          let metadata = db.fileMetadata.get(data.filePath);

          messaging.broadcast("FILEUPDATE", {
            filePath: data.filePath,
            ospath: metadata.ospath,
            status: metadata.status,
            version: metadata.version
          });

          return Promise.resolve();
        });
    }

  }
};