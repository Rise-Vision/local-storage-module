const {dirname} = require("path");
const db = require("../../db/api");
const update = require("../update/update");

module.exports = {
  assignOwnersOfParentDirectory(message) {
    const {filePath} = message;

    const folderPath = `${dirname(filePath)}/`;
    const folderItem = db.owners.get(folderPath);

    if (!folderItem) {
      return Promise.reject(new Error(`No owners registered for folder ${folderPath}`));
    }

    return db.owners.put({filePath, owners: folderItem.owners});
  },
  process(message) {
    return update.validate(message, "add")
    .then(module.exports.assignOwnersOfParentDirectory)
    .then(() => update.update(message));
  }
};
