const db = require("./db/api");

const SEQUENCE_TIMEOUT = 30 * 60 * 60 * 1000; // eslint-disable-line no-magic-numbers

function scheduleIncreaseSequence(schedule = setTimeout) {
  schedule(() => db.watchlist.increaseRuntimeSequence(), SEQUENCE_TIMEOUT);
}

module.exports = {
  scheduleIncreaseSequence
};
