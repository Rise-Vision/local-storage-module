/* eslint-env mocha */
/* eslint-disable function-paren-newline, no-magic-numbers */

const assert = require("assert");
const os = require("os");
const path = require("path");
const {platform} = require("rise-common-electron");
const simple = require("simple-mock");

const broadcastIPC = require("../../../../src/messaging/broadcast-ipc");
const database = require("../../../../src/db/lokijs/database");
const db = require("../../../../src/db/api");
const watch = require("../../../../src/messaging/watch/watch");

const dbSaveInterval = 5;

describe("watch - integration", ()=>{
  before(()=>{
    const tempDBPath = path.join(os.tmpdir(), "local-storage");

    return platform.mkdirRecursively(tempDBPath)
    .then(()=>{
      return database.start(os.tmpdir(), dbSaveInterval);
    })
    .then(()=>{
      return new Promise(res=>setTimeout(()=>{
        res();
      }, dbSaveInterval * dbSaveInterval));
    });
  });

  after(()=>{
    database.destroy();
    database.close();
  });

  beforeEach(()=>{
    simple.mock(broadcastIPC, "fileUpdate").returnWith();
  });

  afterEach(()=>{
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
    db.expired.clear();
  });

  describe("WATCH-RESULT", () => {

    it("processes a folder WATCH-RESULT with new files", () => {
      db.owners.put({filePath: "bucket/dir/", owners: ["licensing"]});

      const message = {
        topic: "watch-result",
        msg: "ok",
        folderData: [
          {filePath: "bucket/dir/file1", version: "1", token: {}},
          {filePath: "bucket/dir/file2", version: "1", token: {}}
        ],
        watchlistLastChanged: "123456"
      };

      const testFilePaths = ["bucket/dir/file1", "bucket/dir/file2"];

      return watch.msResult(message)
      .then(() => {
        const metaDataList = db.fileMetadata.allEntries()
        .map(({filePath, status, version}) =>
          ({filePath, status, version})
        );

        assert.deepEqual(metaDataList, [
          {
            filePath: "bucket/dir/file1", status: "STALE", version: "1"
          },
          {
            filePath: "bucket/dir/file2", status: "STALE", version: "1"
          }
        ]);

        const watchList = db.watchlist.allEntries()
        .map(({filePath, version}) => ({filePath, version}));

        assert.deepEqual(watchList, [
          {filePath: "bucket/dir/file1", version: "1"},
          {filePath: "bucket/dir/file2", version: "1"}
        ]);

        assert.equal(db.watchlist.lastChanged(), 123456);

        testFilePaths.forEach(filePath => {
          const owners = db.owners.get(filePath);

          assert(owners);
          assert.deepEqual(owners.owners, ['licensing']);
        });

        // 2 new files
        assert.equal(broadcastIPC.fileUpdate.callCount, 2);
        broadcastIPC.fileUpdate.calls.forEach(call =>{
          const ipcMessage = call.args[0];

          assert.equal(ipcMessage.status, "STALE");
          assert.equal(ipcMessage.version, "1");
          assert(testFilePaths.includes(ipcMessage.filePath));
        });
      });
    });

  });

});
