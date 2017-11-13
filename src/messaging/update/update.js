const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  process(message) {
    const {files} = message;
    const filesForUpdate = entry.validateAndFilter(files);

    if (!filesForUpdate) {
      return Promise.reject(new Error("Invalid update message"));
    }

    return Promise.all(filesForUpdate.map((file) => {
      return Promise.all([db.fileMetadata.put, db.watchlist.put].map((action) => {
        const dbEntry = Object.assign({}, file, {status: "STALE"});

        return action(dbEntry);
      }));
    }));
  }
};
