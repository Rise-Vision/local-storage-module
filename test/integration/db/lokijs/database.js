/* eslint-env mocha */
const assert = require("assert");
const database = require("../../../../src/db/lokijs/database");
const path = require("path");
const {platform} = require("rise-common-electron");
const os = require("os");
const simple = require("simple-mock");
const timeoutDelay = 5000;

describe("lokijs - integration", ()=>{
  afterEach(()=>{
    simple.restore();
  });

  after(()=>{
    database.destroy();
    database.close();
  });

  it("creates local-storage.db file", (done)=>{
    const tempDBPath = path.join(os.tmpdir(), "lokijs_test_dir");
    platform.mkdirRecursively(tempDBPath)
    .then(()=>{
      return database.start(tempDBPath);
    })
    .then(()=>{
      return setTimeout(()=>{
        assert(platform.fileExists(path.join(tempDBPath, "local-storage.db")));
        done();
      }, timeoutDelay);
    });
  });
});
