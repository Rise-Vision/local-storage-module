const MODULE_NAME = "local-storage";

let displayId = "";
let moduleVersion = "";

module.exports = {
  secondMillis: 1000,
  moduleName: MODULE_NAME,
  bqProjectName: "client-side-events",
  bqDatasetName: "Module_Events",
  bqFailedEntryFile: `${MODULE_NAME}-failed.log`,
  bqTableName: `${MODULE_NAME}-events`,
  setDisplayId(id) {displayId = id;},
  getDisplayId() {return displayId;},
  setModuleVersion(version) {moduleVersion = version;},
  getModuleVersion() {return moduleVersion;}
};
