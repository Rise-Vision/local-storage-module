const assert = require("assert"),
  database = require("../../../../src/db/lokijs/database"),
  path = require("path"),
  {platform} = require("rise-common-electron"),
  simple = require("simple-mock");

describe("lokijs - integration", ()=>{

  afterEach(()=>{
    simple.restore();

  });

  after(()=>{
    database.destroy();
    database.close();
  });

  it("creates local-storage.db file", (done)=>{
    let filePath = path.join(platform.getHomeDir(), "test_dir");
    platform.mkdirRecursively(filePath)
      .then(()=>{
        return database.start(path.join(platform.getHomeDir(), "test_dir"))
      })
      .then(()=>{
        return setTimeout(()=>{
          assert(platform.fileExists(path.join(platform.getHomeDir(), "test_dir", "local-storage.db")));
          done();
        },5000);
      });

  });

});