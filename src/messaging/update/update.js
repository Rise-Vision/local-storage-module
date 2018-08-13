const db = require("../../db/api");
const {dirname} = require("path");
const entry = require("./entry");
const broadcastIPC = require("../broadcast-ipc");
const logger = require("../../logger");

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
    .then(()=>{
      broadcastIPC.fileUpdate({filePath, status: "STALE", version});
    })
    .then(() => db.watchlist.setLastChanged(message.watchlistLastChanged));
  },
  process(message) {
    return module.exports.validate(message, "update")
    .then(()=>module.exports.assignOwnersOfParentDirectory(message, 'MSFILEUPDATE'))
    .then(()=>module.exports.update(message));
  },
  validate(message, type) {
    const {filePath, version, token} = message;

    logger.file(`Received ${type} version ${version} for ${filePath}`);
    logger.file(`Token timestamp ${token.data.timestamp}`);

    if (!entry.validate(message)) {
      return Promise.reject(new Error(`Invalid ${type} message`));
    }

    return Promise.resolve(message);
  },
  assignOwnersOfParentDirectory(message, topic) {
    const {filePath} = message;

    const folderPath = `${dirname(filePath)}/`;
    const folderItem = db.owners.get(folderPath);

    if (!folderItem) {
      logger.warning(`No owners registered for folder ${folderPath} | topic: ${topic}`);

      return Promise.resolve(false);
    }

    db.owners.put({filePath, owners: folderItem.owners});
    return Promise.resolve(true);
  }
};
