const MODULE_NAME = "local-storage";

let displayId = "";
let moduleVersion = "";

let authorized = false;

function setAuthorized(flag) {
  authorized = flag;
}

function isAuthorized() {
  return authorized;
}

module.exports = {
  secondMillis: 1000,
  moduleName: MODULE_NAME,
  initialLogDelay: 5000,
  bqProjectName: "client-side-events",
  bqDatasetName: "Module_Events",
  bqFailedEntryFile: `${MODULE_NAME}-failed.log`,
  bqTableName: `local_storage_events`,
  setDisplayId(id) {displayId = id;},
  getDisplayId() {return displayId;},
  setModuleVersion(version) {moduleVersion = version;},
  getModuleVersion() {return moduleVersion;},
  setAuthorized,
  isAuthorized
};
