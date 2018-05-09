const {dirname} = require("path");
const db = require("../../db/api");
const update = require("../update/update");

module.exports = {
  assignOwnersOfParentDirectory(topic, message) {
    const {filePath} = message;

    const folderPath = `${dirname(filePath)}/`;
    const folderItem = db.owners.get(folderPath);

    if (!folderItem) {
      log.warning(`No owners registered for folder ${folderPath} | topic: ${topic}`);

      return Promise.resolve(false);
    }

    db.owners.put({filePath, owners: folderItem.owners});
    return Promise.resolve(true);
  },
  process(message) {
    return update.validate(message, "add")
    .then(() => module.exports.assignOwnersOfParentDirectory('MSFILEUPDATE', message))
    .then(assigned => assigned && update.update(message));
  }
};
