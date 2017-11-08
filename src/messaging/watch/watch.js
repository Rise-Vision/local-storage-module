/* eslint-disable no-warning-comments */

const db = require("../../db/api");
const entry = require("./entry");
const messaging = require("../messaging");

module.exports = {
  process(message) {
    const {data, from} = message;

    if (!entry.validate({filePath: data.filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    const isWatched = db.watchlist.get(data.filePath);
    const status = db.fileMetadata.get(data.filePath, "status");

    if (isWatched) {
      // status is known and file is being watched
      db.owners.put({filePath: data.filePath, owner: from})
        .then(()=>{
          const metadata = db.fileMetadata.get(data.filePath);

          messaging.broadcast("FILEUPDATE", {
            filePath: data.filePath,
            ospath: metadata.ospath,
            status: metadata.status,
            version: metadata.version
          });

          return Promise.resolve();
        });
    } else {
      if (status === "UNKNOWN") {
        // TODO: file exists but not being watched
      }

      if (!status) {
        // TODO: file is new
      }
    }

  }
};
