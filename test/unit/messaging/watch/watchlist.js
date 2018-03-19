/* eslint-env mocha */
/* eslint-disable function-paren-newline, array-bracket-newline, no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");

const db = require("../../../../src/db/api");
const watch = require("../../../../src/messaging/watch/watch");
const watchlist = require("../../../../src/messaging/watch/watchlist");

global.log = {file: ()=>{}, debug: ()=>{}, error: ()=>{}, all: () => {}};

describe("watchlist - unit", ()=>{

  beforeEach(()=>{
    simple.mock(commonMessaging, "sendToMessagingService").returnWith();
    simple.mock(watch, "process").returnWith();
  });

  afterEach(() => simple.restore());

  it("requests WATCHLIST-COMPARE", ()=> {
    const testEntries = [
      {
        filePath: "my-bucket/my-file",
        version: "1"
      },
      {
        filePath: "my-bucket/my-other-file",
        version: "2"
      }
    ];

    simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

    watchlist.requestWatchlistCompare();

    assert(commonMessaging.sendToMessagingService.callCount, 1);
    assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
      topic: "WATCHLIST-COMPARE",
      watchlist: [
        {
          filePath: "my-bucket/my-file",
          version: "1"
        },
        {
          filePath: "my-bucket/my-other-file",
          version: "2"
        }
      ]
    });
  });

  it("requests update from a list of filepaths received", ()=> {
    const testEntries = [
      {filePath: "bucket/file1", status: "CURRENT", version: "1"},
      {filePath: "bucket/file2", status: "CURRENT", version: "2"},
      {filePath: "bucket/file3", status: "CURRENT", version: "3"}
    ];

    simple.mock(db.owners, "get").returnWith({owners: ['licensing']});
    simple.mock(db.fileMetadata, "get").callFn(filePath =>
      testEntries.find(entry => entry.filePath === filePath)
    );
    simple.mock(db.fileMetadata, "put").resolveWith();

    const updated = ["bucket/file1", "bucket/file3"];

    return watchlist.updateFilesStatusAndRequestUpdatedFiles(updated)
    .then(() => {
      assert.equal(watch.process.callCount, 2);

      watch.process.calls.forEach(call => {
        const message = call.args[0];

        assert(typeof message === 'object');
        assert.equal(message.from, 'licensing');
        assert(updated.includes(message.filePath));
      });

      assert.deepEqual(testEntries, [
        {filePath: "bucket/file1", status: "UNKNOWN", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "UNKNOWN", version: "3"}
      ]);
    });
  });

  it("does not request update if no filepaths are received", ()=> {
    return watchlist.updateFilesStatusAndRequestUpdatedFiles([])
    .then(() => assert(!watch.process.called));
  });

});
