const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  updateWatchlistAndMetadata(dbEntry) {
    const actions = [db.fileMetadata.put, db.watchlist.put];

    return Promise.all(actions.map(action => action(dbEntry)));
  },
  update(message) {
    const {filePath, version, token} = message;

    return module.exports.updateWatchlistAndMetadata({
      filePath, version, token, status: "STALE"
    })
    .then(() => db.watchlist.setLastChanged(message.watchlistLastChanged));
  },
  process(message) {
    return module.exports.validate(message, "update")
    .then(module.exports.update);
  },
  validate(message, type) {
    const {filePath, version, token} = message;

    log.file(`Received ${type} version ${version} for ${filePath}`);
    log.file(`Token timestamp ${token.data.timestamp}`);

    if (!entry.validate(message)) {
      return Promise.reject(new Error(`Invalid ${type} message`));
    }

    return Promise.resolve(message);
  }
};
