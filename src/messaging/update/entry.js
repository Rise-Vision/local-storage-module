const gcsValidator = require("gcs-filepath-validator");

module.exports = {
  validate({filePath, version, token} = {}) {
    if (!filePath || !version || !token) {return false;}
    if (!token.hash || !token.data) {return false;}

    return gcsValidator.validateFilepath(filePath);
  },
  validateDirectCacheProcess({fileId, data, from} = {}) {
    if (!fileId || !data || typeof data !== 'string' || !from) {return false;}

    return true;
  }
};
