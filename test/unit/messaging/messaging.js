/* eslint-env mocha */
const messaging = require("../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");

describe("Messaging", ()=>{
  let messageReceiveHandler = null;

  const mockReceiver = {
    on(evt, handler) {
      if (evt === "message") {
        messageReceiveHandler = handler;
      }
    }
  };

  beforeEach(()=>{
    simple.mock(commonConfig, "sendToMessagingService").returnWith();
    simple.mock(commonConfig, "receiveMessages").resolveWith(mockReceiver);

    return messaging.init();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("calls remote watch when the local file is not present", ()=>{
    const mockMetadata = {};

    simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);

    const msg = {
      topic: "watch",
      from: "test-module",
      data: {filePath: "test-bucket/test-file"}
    };

    messageReceiveHandler(msg);
    assert(commonConfig.sendToMessagingService.called);
  });

  it("calls remote watch when the local file state is UNKNOWN", ()=>{
    const mockMetadata = {
      status: "UNKNOWN"
    };

    simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);

    const msg = {
      topic: "watch",
      from: "test-module",
      data: {filePath: "test-bucket/test-file"}
    };

    messageReceiveHandler(msg);
    assert(commonConfig.sendToMessagingService.called);
  });
});
