/* eslint-env mocha */

const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");

const messaging = require("../../../src/messaging/messaging");
const deletion = require("../../../src/messaging/delete/delete");
const update = require("../../../src/messaging/update/update");

describe("Messaging - unit", ()=> {
  beforeEach(() => {
    simple.mock(commonMessaging, "getClientList").returnWith();
    simple.mock(deletion, "process").resolveWith();
    simple.mock(update, "process").resolveWith();
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
          assert.equal(update.process.callCount, 1);
          assert.deepEqual(update.process.lastCall.args[0], message);

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

});
