const db = require("./db/api");
const logger = require("./logger");

const SEQUENCE_TIMEOUT = 30 * 60 * 60 * 1000; // eslint-disable-line no-magic-numbers

function clean(filePath) {
  console.log(filePath);
  return Promise.resolve(filePath);
}

function cleanExpired() {
  return Promise.resolve()
  .then(() => {
    const expired = db.fileMetadata.find({watchSequence: {"$gt": 0}})
    .filter(db.watchlist.shouldBeExpired);

    return Promise.all(expired.map(entry => module.exports.clean(entry.filePath)));
  })
  .catch(error => logger.error(error, 'Error while cleaning expired entries and files'));
}

function scheduleIncreaseSequence(schedule = setTimeout) {
  schedule(() => db.watchlist.increaseRuntimeSequence(), SEQUENCE_TIMEOUT);
}

module.exports = {
  clean,
  cleanExpired,
  scheduleIncreaseSequence
};
