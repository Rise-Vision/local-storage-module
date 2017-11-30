let displayId = "";
let moduleVersion = "";

module.exports = {
  secondMillis: 1000,
  moduleName: "local-storage",
  bqProjectName: "client-side-events",
  bqDatasetName: "Module_Events",
  bqFailedEntryFile: "local-storage-failed.log",
  bqTableName: "local-storage-events",
  setDisplayId(id) {displayId = id;},
  getDisplayId() {return displayId;},
  setModuleVersion(version) {moduleVersion = version;},
  getModuleVersion() {return moduleVersion;}
};
