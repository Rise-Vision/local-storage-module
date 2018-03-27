// const {dirname} = require("path");
const update = require("../update/update");

module.exports = {
  process(message) {
    return update.validate(message, "add")
    .then(update.update);
  }
};
