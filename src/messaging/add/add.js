const update = require("../update/update");

module.exports = {
  process(message) {
    return update.process(message);
  }
};
