const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  process(message) {
    const {filePath, version, token} = message;

    if (!entry.validate({filePath, version, token})) {
      return Promise.reject(new Error("Invalid add/update message"));
    }

    return Promise.all([db.fileMetadata.put, db.watchlist.put].map((action) => {
      const dbEntry = Object.assign({}, {filePath, version, token}, {status: "STALE"});

      return action(dbEntry);
    }));
  }
};
