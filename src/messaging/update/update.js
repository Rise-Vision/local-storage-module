const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  updateWatchlistAndMetadata(dbEntry) {
    const actions = [db.fileMetadata.put, db.watchlist.put];

    return Promise.all(actions.map(action => action(dbEntry)));
  },
  update(message) {
    const {filePath, version, token} = message;
    log.file(`Received updated version ${version} for ${filePath}`);
    log.file(`Token timestamp ${token.data.timestamp}`);

    if (!entry.validate({filePath, version, token})) {
      return Promise.reject(new Error("Invalid add/update message"));
    }

    return module.exports.updateWatchlistAndMetadata({
      filePath, version, token, status: "STALE"
    });
  },
  process(message) {
    return module.exports.update(message)
    .then(() => db.watchlist.setLastChanged(message.watchlistLastChanged));
  }
};
