const database = require("./db/lokijs/database");
const fileSystem = require("./files/file-system");
const messaging = require("./messaging/messaging");

const initialize = () => {
  return fileSystem.cleanupDownloadFolder()
    .then(fileSystem.createDir(fileSystem.getDownloadDir()))
    .then(fileSystem.createDir(fileSystem.getCacheDir()));
};

initialize()
  .then(database.start())
  .then(messaging.init)
  .catch((err)=>{
    console.log(err);
  });
