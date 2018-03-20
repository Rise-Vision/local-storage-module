const COLLECTIONS = ["metadata", "last_changed", "owners", "watchlist"];

const commonConfig = require("common-display-module");
const config = require("../../../src/config/config");
const loki = require("lokijs");
const path = require("path");

const defaultSaveInterval = 4000;

let db = null;

const initCollections = () => {
  COLLECTIONS.forEach((collName)=>{
    const collection = db.getCollection(collName);

    if (!collection) {
      db.addCollection(collName, {
        unique: ["filePath"]
      });
    }
  });
};

module.exports = {
  close(cb) {
    if (db) {
      db.close(cb);
    }
  },
  destroy(cb = ()=>{}) {
    if (db) {
      db.deleteDatabase(cb);
    }
  },
  start(dirPath = null, saveInterval = defaultSaveInterval) {
    return new Promise((res, rej)=>{
      try {
        const dbPath = path.join(dirPath || commonConfig.getModuleDir(), config.moduleName, `${config.moduleName}.db`);

        db = new loki(dbPath, {
          autoload: true,
          autoloadCallback: ()=>{
            initCollections();
            res();
          },
          autosave: true,
          autosaveInterval: saveInterval,
          env: "NODEJS"
        });
      } catch (err) {
        rej(err);
      }
    });
  },
  getCollection(name) {
    return db.getCollection(name);
  }
};
