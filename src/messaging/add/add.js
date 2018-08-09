const update = require("../update/update");

module.exports = {
  process(message) {
    return update.validate(message, "add")
    .then(()=>update.assignOwnersOfParentDirectory(message, 'MSFILEUPDATE'))
    .then(assigned => assigned && update.update(message));
  }
};
