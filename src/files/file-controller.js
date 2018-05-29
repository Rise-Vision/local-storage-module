const file = require("./file");
const fileSystem = require("./file-system");
const urlProvider = require("./url-provider");
const broadcastIPC = require("../../src/messaging/broadcast-ipc.js");
const db = require("../db/api");

const SUCCESS_CODE = 200;

const checkAvailableDiskSpace = (filePath, fileSize = 0) => {
  return fileSystem.getAvailableSpace()
  .then(spaceInDisk=>{
    const availableSpace = fileSystem.isThereAvailableSpace(spaceInDisk, fileSize);

    if (!availableSpace) {
      broadcastIPC.fileError({filePath, msg: "Insufficient disk space"});

      return false;
    }

    return true;
  }).catch(err => {
    broadcastIPC.fileError({filePath, msg: "Failed to retrieve available space"});
    return Promise.reject(err);
  });
};

const validateResponse = (filePath, response) => {
  return new Promise((res, rej) => {
    if (response.statusCode === SUCCESS_CODE) {
      const fileSize = response.headers["content-length"];

      checkAvailableDiskSpace(filePath, fileSize)
      .then((availableSpace) => {
        if (!availableSpace) {
          rej(new Error("Insufficient disk space"));
        }

        res(response);
      }).catch(err => {
        rej(err);
      });
    } else {
      broadcastIPC.fileError({
        filePath,
        msg: `Invalid response with status code ${response.statusCode}`
      });

      rej(new Error(`Invalid response with status code ${response.statusCode}`));
    }
  });
};

module.exports = {
  addToProcessing(filePath, version) {
    const fileName = fileSystem.getFileName(filePath, version);
    fileSystem.addToProcessingList(fileName);
  },
  isProcessing(filePath, version) {
    const fileName = fileSystem.getFileName(filePath, version);
    return fileSystem.isProcessing(fileName);
  },
  removeFromProcessing(filePath, version) {
    const fileName = fileSystem.getFileName(filePath, version);
    fileSystem.removeFromProcessingList(fileName);
  },
  download(entry) {
    const {filePath, version, token} = entry;

    if (module.exports.isProcessing(filePath)) {return Promise.resolve();}

    module.exports.addToProcessing(filePath);

    return checkAvailableDiskSpace(filePath)
    .then((availableSpace) => {
      if (!availableSpace) {
        return Promise.reject(Error("Insufficient disk space"));
      }

      return urlProvider.getURL(token);
    })
    .then((signedURL)=>{
      if (!signedURL) {
        return Promise.reject(Error("No signed URL"));
      }
      return file.request(filePath, signedURL);
    })
    .then(response=>validateResponse(filePath, response))
    .then(response=>file.writeToDisk(filePath, version, response))
    .then(()=>module.exports.removeFromProcessing(filePath))
    .then(()=>module.exports.broadcastAfterDownload(version, filePath))
    .catch(err=>{
      module.exports.removeFromProcessing(filePath);
      return Promise.reject(err);
    });
  },
  broadcastAfterDownload(downloadedVersion, filePath) {
    const currentVersion = db.fileMetadata.get(filePath).version;
    const newStatus = currentVersion === downloadedVersion ?
      "CURRENT" :
      "STALE";

    return db.fileMetadata.put({filePath, status: newStatus})
    .then(({status})=>{
      broadcastIPC.fileUpdate({filePath, status, version: currentVersion});
    });
  }
};
