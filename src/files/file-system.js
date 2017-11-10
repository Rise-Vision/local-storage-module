const commonConfig = require("common-display-module"),
  path = require("path");

module.exports = {

  osPath(filePath) {
    return path.join(commonConfig.getLocalStoragePath(), `create-dir-structure-for-${filePath}`);
  }

};
