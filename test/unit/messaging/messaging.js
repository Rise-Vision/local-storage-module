/* eslint-env mocha */
const messaging = require("../../../src/messaging/messaging.js");
const ms = require("../../../src/messaging/messaging-service.js");
const assert = require("assert");
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
    simple.mock(commonConfig, "receiveMessages").resolveWith(mockReceiver);
    simple.mock(ms, "watch").returnWith(true);

    return messaging.init();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("calls remote watch when the local file is not present", ()=>{
    const msg = {
      topic: "watch",
      data: {test: "test"}
    };

    messageReceiveHandler(msg);
    assert(ms.watch.called);
  });

  it("calls remote watch when the local file state is UNKNOWN", ()=>{
    const msg = {
      topic: "watch",
      data: {test: "test"}
    };

    messageReceiveHandler(msg);
    assert(ms.watch.called);
  });
});
