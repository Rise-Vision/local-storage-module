const gcsValidator = require("gcs-filepath-validator");

module.exports = {
  validate({filePath, owner} = {}) {
    if (!filePath || !owner) {return false;}

    return gcsValidator.validateFilepath(filePath);
  }
};
