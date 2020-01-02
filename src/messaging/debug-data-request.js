const db = require("../db/api");
const logger = require("../logger");
const fileSystem = require("../files/file-system");
const MAXLEN = 950000;

module.exports = {
  process() {
    const debugData = {};

    return fileSystem.getCacheDirEntries()
    .then(files => {
      debugData.files = files.map(({path}) => ({path}))
    })
    .then(()=>debugData.databaseContents = db.getEntireDBObject())
    .then(() => {
      const logData = JSON.stringify(debugData);
      const dataLen = logData.length;
      const bqDetails = dataLen < MAXLEN ? logData : `too large: ${dataLen}`;

      logger.all('debug-data-request', bqDetails);
    })
  }
}
