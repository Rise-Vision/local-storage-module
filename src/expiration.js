const db = require("./db/api");
const logger = require("./logger");

const SEQUENCE_TIMEOUT = 30 * 60 * 60 * 1000; // eslint-disable-line no-magic-numbers

function cleanContentsIfFolder(filePath) {
  if (!filePath.endsWith("/")) {
    return Promise.resolve();
  }

  const folderFileNames = db.fileMetadata.getFolderFiles(filePath)
  .map(entry => entry.filePath);

  return Promise.all(folderFileNames.map(clean));
}

function clean(filePath) {
  return cleanContentsIfFolder(filePath)
  .then(() => db.deleteAllDataFor(filePath));
}

function cleanExpired() {
  return Promise.resolve()
  .then(() => {
    const expired = db.fileMetadata.find({watchSequence: {"$gt": 0}})
    .filter(db.watchlist.shouldBeExpired);

    return Promise.all(expired.map(entry => clean(entry.filePath)));
  })
  .catch(error => logger.error(error, 'Error while cleaning expired entries and files'));
}

function scheduleIncreaseSequence(schedule = setTimeout) {
  schedule(() => db.watchlist.increaseRuntimeSequence(), SEQUENCE_TIMEOUT);
}

module.exports = {
  cleanExpired,
  scheduleIncreaseSequence
};
