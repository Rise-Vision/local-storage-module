const broadcastIPC = require("../broadcast-ipc.js");
const db = require("../../db/api");
const gcsValidator = require("gcs-filepath-validator");

module.exports = {
  process(message) {
    const {filePath, watchlistLastChanged} = message;

    if (!gcsValidator.validateFilepath(filePath)) {
      return Promise.reject(new Error("Invalid delete message"));
    }

    broadcastIPC.fileUpdate({
      filePath,
      status: "DELETED"
    });

    return db.fileMetadata.delete(filePath)
    .then(() => db.watchlist.setLastChanged(watchlistLastChanged));
  }
};
