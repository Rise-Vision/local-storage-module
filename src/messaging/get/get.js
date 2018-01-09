const broadcastIPC = require("../broadcast-ipc.js");
const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  directCacheProcess(message) {
    const {filePath} = message;

    if (!entry.validateDirectCacheProcess({filePath})) {
      return Promise.reject(new Error("Invalid CACHE message"));
    }

    const retrievedMetadata = db.directCacheFileMetadata.get(filePath)

    if (!retrievedMetadata || !retrievedMetadata.filePath) {throw Error("invalid retrieved file");}
    return broadcastIPC.fileUpdate({filePath: retrievedMetadata.filePath});
  }
};
