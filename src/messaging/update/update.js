const db = require("../../db/api");
const entry = require("./entry");
const file = require("../../files/file");

module.exports = {
  process(message) {
    const {filePath, version, token} = message;
    log.file(`Received updated version ${version} for ${filePath}`);
    log.file(`Token timestamp ${token.data.timestamp}`);

    if (!entry.validate({filePath, version, token})) {
      return Promise.reject(new Error("Invalid add/update message"));
    }

    return Promise.all([db.fileMetadata.put, db.watchlist.put].map((action) => {
      const dbEntry = Object.assign({}, {filePath, version, token}, {status: "STALE"});

      return action(dbEntry);
    }));
  },
  directCacheProcess(message) {
    const {filePath, data, from, timestamp} = message;

    log.file(`Received updated version ${timestamp} for ${filePath}`);

    if (!entry.validateDirectCacheProcess({filePath, data, from})) {
      return Promise.reject(new Error("Invalid add/update message"));
    }

    // check size before calling
    return file.writeDirectlyToDisk(filePath, data, from)
    .then(() => {
      db.directCacheFileMetadata.put(Object.assign({}, {filePath, timestamp}));
    });
  }
};
