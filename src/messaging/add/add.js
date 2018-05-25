const {dirname} = require("path");
const db = require("../../db/api");
const update = require("../update/update");
const logger = require("../../logger");

module.exports = {
  assignOwnersOfParentDirectory(message, topic) {
    const {filePath} = message;

    const folderPath = `${dirname(filePath)}/`;
    const folderItem = db.owners.get(folderPath);

    if (!folderItem) {
      logger.warning(`No owners registered for folder ${folderPath} | topic: ${topic}`);

      return Promise.resolve(false);
    }

    db.owners.put({filePath, owners: folderItem.owners});
    return Promise.resolve(true);
  },
  process(message) {
    return update.validate(message, "add")
    .then(() => module.exports.assignOwnersOfParentDirectory(message, 'MSFILEUPDATE'))
    .then(assigned => assigned && update.update(message));
  }
};
