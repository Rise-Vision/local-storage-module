const file = require("./file");
const fileSystem = require("./file-system");
const urlProvider = require("./url-provider");
const broadcastIPC = require("../../src/messaging/broadcast-ipc.js");

const SUCCESS_CODE = 200;

const checkAvailableDiskSpace = (filePath, fileSize = 0) => {
  return fileSystem.getAvailableSpace()
  .then(spaceInDisk=>{
    const availableSpace = fileSystem.isThereAvailableSpace(spaceInDisk, fileSize);

    if (!availableSpace) {
      broadcastIPC.broadcast("FILE-ERROR", {
        filePath,
        msg: "Insufficient disk space"
      });

      return false;
    }

    return true;
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
        });
    } else {
      broadcastIPC.broadcast("FILE-ERROR", {
        filePath,
        msg: `Invalid response with status code ${response.statusCode}`
      });

      rej(new Error(`Invalid response with status code ${response.statusCode}`));
    }
  });
};

module.exports = {
  addToProcessing(filePath) {
    const fileName = fileSystem.getFileName(filePath);
    fileSystem.addToProcessingList(fileName);
  },
  isProcessing(filePath) {
    const fileName = fileSystem.getFileName(filePath);
    return fileSystem.isProcessing(fileName);
  },
  removeFromProcessing(filePath) {
    const fileName = fileSystem.getFileName(filePath);
    fileSystem.removeFromProcessingList(fileName);
  },
  download(filePath, token) {
    if (module.exports.isProcessing(filePath) {return Promise.resolve();}

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
    .then(response=>file.writeToDisk(filePath, response))
    .then(()=>module.exports.removeFromProcessing(filePath))
    .catch(err=>{
      fileController.removeFromProcessing(filePath);
      return Promise.reject(err);
    });
  }
};
