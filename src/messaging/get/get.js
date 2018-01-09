const broadcastIPC = require("../broadcast-ipc.js");
const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  directCacheProcess(message) {
    const {fileId} = message;

    if (!entry.validateDirectCacheProcess({fileId})) {
      return Promise.reject(new Error("Invalid CACHE message"));
    }

    const retrievedMetadata = db.directCacheFileMetadata.get(fileId)

    if (!retrievedMetadata || !retrievedMetadata.fileId) {throw Error("invalid retrieved file");}
    broadcastIPC.fileUpdate(Object.assign({}, {fileId}, {status: "CACHED"}));
  }
};
