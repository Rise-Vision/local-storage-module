const broadcastIPC = require("../broadcast-ipc.js");
const db = require("../../db/api");
const gcsValidator = require("gcs-filepath-validator");

module.exports = {
  process(message) {
    const {filePath} = message;

    if (!gcsValidator.validateFilepath(filePath)) {
      return Promise.reject(new Error("Invalid delete message"));
    }

    return db.fileMetadata.delete(filePath)
      .then(db.owners.delete(filePath))
      .then(db.watchlist.delete(filePath))
      .then(()=>{
        return broadcastIPC.fileUpdate(Object.assign({}, {filePath}, {status: "DELETED"}));
      });
  },
  directCacheProcess(message) {
    const {filePath} = message;

    if (!filePath) {
      return Promise.reject(new Error("Invalid delete message"));
    }

    return db.directCacheFileMetadata.delete(filePath)
      .then(()=>{
        return broadcastIPC.fileUpdate(Object.assign({}, {filePath}, {status: "DELETED"}));
      });
  }
};
