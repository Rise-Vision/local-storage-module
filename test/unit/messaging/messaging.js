/* eslint-env mocha */

const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");

const messaging = require("../../../src/messaging/messaging");
const add = require("../../../src/messaging/add/add");
const deletion = require("../../../src/messaging/delete/delete");
const update = require("../../../src/messaging/update/update");
const clearLocalStorageRequest = require("../../../src/messaging/clear-local-storage-request");
const debugDataRequest = require("../../../src/messaging/debug-data-request");

describe("Messaging - unit", ()=> {
  beforeEach(() => {
    simple.mock(commonMessaging, "getClientList").returnWith();
    simple.mock(add, "process").resolveWith();
    simple.mock(deletion, "process").resolveWith();
    simple.mock(update, "process").resolveWith();
    simple.mock(clearLocalStorageRequest, "process").resolveWith();
    simple.mock(debugDataRequest, "process").resolveWith();
  });

  afterEach(() => simple.restore());

  it("processes MS file updates", done => {
    simple.mock(commonMessaging, "receiveMessages").resolveWith({
      on: (type, handler) => {
        assert.equal(type, "message");

        const message = {topic: "MSFILEUPDATE", type: "UPDATE"}

        handler(message)
        .then(() => {
          assert.equal(update.process.callCount, 1);
          assert.deepEqual(update.process.lastCall.args[0], message);

          done();
        });
      }
    });

    messaging.init();
  });

  it("processes MS file additions", done => {
    simple.mock(commonMessaging, "receiveMessages").resolveWith({
      on: (type, handler) => {
        assert.equal(type, "message");

        const message = {topic: "MSFILEUPDATE", type: "ADD"}

        handler(message)
        .then(() => {
          assert.equal(add.process.callCount, 1);
          assert.deepEqual(add.process.lastCall.args[0], message);

          done();
        });
      }
    });

    messaging.init();
  });

  it("processes MS file deletions", done => {
    simple.mock(commonMessaging, "receiveMessages").resolveWith({
      on: (type, handler) => {
        assert.equal(type, "message");

        const message = {topic: "MSFILEUPDATE", type: "DELETE"}

        handler(message)
        .then(() => {
          assert.equal(deletion.process.callCount, 1);
          assert.deepEqual(deletion.process.lastCall.args[0], message);

          done();
        });
      }
    });

    messaging.init();
  });

  it("processes CLEAR-LOCAL-STORAGE-REQUEST", done => {
    simple.mock(commonMessaging, "receiveMessages").resolveWith({
      on: (type, handler) => {
        assert.equal(type, "message");

        const message = {msg: "CLEAR-LOCAL-STORAGE-REQUEST"}

        handler(message)
        .then(() => {
          assert.equal(clearLocalStorageRequest.process.callCount, 1);

          done();
        });
      }
    });

    messaging.init();
  });

  it("processes DEBUG-DATA-REQUEST", done => {
    simple.mock(commonMessaging, "receiveMessages").resolveWith({
      on: (type, handler) => {
        assert.equal(type, "message");

        const message = {msg: "DEBUG-DATA-REQUEST"}

        handler(message)
        .then(() => {
          assert.equal(debugDataRequest.process.callCount, 1);

          done();
        });
      }
    });

    messaging.init();
  });

});
