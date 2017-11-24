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
        broadcastIPC.broadcast("FILE-UPDATE", {
          filePath,
          status: "DELETED"
        });
      });
  }
};