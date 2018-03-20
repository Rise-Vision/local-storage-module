const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  update(message) {
    const {filePath, version, token} = message;
    log.file(`Received updated version ${version} for ${filePath}`);
    log.file(`Token timestamp ${token.data.timestamp}`);

    if (!entry.validate({filePath, version, token})) {
      return Promise.reject(new Error("Invalid add/update message"));
    }

    return Promise.all([db.fileMetadata.put, db.watchlist.put].map((action) => {
      const dbEntry = {filePath, version, token, status: "STALE"};

      return action(dbEntry);
    }))
  },
  process(message) {
    return module.exports.update(message)
    .then(() => db.watchlist.setLastChanged(message.globalLastChanged));
  }
};
