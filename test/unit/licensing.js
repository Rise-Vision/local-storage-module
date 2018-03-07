/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const simple = require("simple-mock");

const config = require("../../src/config/config");
const licensing = require("../../src/licensing");

describe("Licensing", ()=> {

  beforeEach(() => {
    simple.mock(global.log, "file").returnWith();
    simple.mock(global.log, "all").returnWith();
  });

  afterEach(()=> {
    simple.restore();
    config.setAuthorized(null);
  });

  describe("checkIfLicensingIsAvailable()", () => {

    it("should not request licensing data if licensing module not present", () => {
      simple.mock(licensing, "requestLicensingData").resolveWith();

      licensing.checkIfLicensingIsAvailable({clients: ["local-messaging", "logging"]});
      licensing.clearInitialRequestSent();

      assert.equal(licensing.requestLicensingData.callCount, 0);
    });

    it("should request licensing data only once when licensing module is present", (done) => {
      simple.mock(licensing, "requestLicensingData").resolveWith();

      licensing.checkIfLicensingIsAvailable({clients: ["local-messaging", "logging", "licensing"]});

      assert.equal(licensing.requestLicensingData.callCount, 1);

      setTimeout(()=>{
        licensing.checkIfLicensingIsAvailable({clients: ["local-messaging", "logging", "licensing"]});

        assert.equal(licensing.requestLicensingData.callCount, 1);
        done();
      }, 1000);

    });

  });

  describe("updateLicensingData()", () => {
    it("should be authorized if Rise Storage is active", () => {
      const message = {
        from: "licensing",
        topic: "licensing-update",
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          },
          b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
            active: true, timestamp: 100
          }
        }
      };

      licensing.updateLicensingData(message);

      assert(config.isAuthorized());

      assert(log.all.called);
      assert.equal(log.all.lastCall.args[1].event_details, "authorized");
    });

    it("should not be authorized if Rise Storage is not active", () => {
      const message = {
        from: "licensing",
        topic: "licensing-update",
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: false, timestamp: 100
          },
          b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
            active: false, timestamp: 100
          }
        }
      };

      licensing.updateLicensingData(message);

      assert(!config.isAuthorized());

      assert(log.all.called);
      assert.equal(log.all.lastCall.args[1].event_details, "unauthorized");
    });

    it("should not be authorized if Rise Storage is not present", () => {
      const message = {
        from: "licensing",
        topic: "licensing-update",
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          }
        }
      };

      licensing.updateLicensingData(message);

      assert(!config.isAuthorized());

      assert(!log.all.called);
    });

    it("should broadcast only if there are update changes", () => {
      {
        const message = {
          from: "licensing",
          topic: "licensing-update",
          subscriptions: {
            b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
              active: false, timestamp: 100
            }
          }
        };

        simple.mock(licensing, "sendLicensing").resolveWith();

        licensing.updateLicensingData(message);

        assert(!config.isAuthorized());

        assert.equal(licensing.sendLicensing.callCount, 1);
        assert.equal(log.all.callCount, 1);
        assert.equal(log.all.lastCall.args[1].event_details, "unauthorized");
      }

      {
        const message = {
          from: "licensing",
          topic: "licensing-update",
          subscriptions: {
            b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
              active: false, timestamp: 200
            }
          }
        };

        licensing.updateLicensingData(message);

        assert(!config.isAuthorized());

        // should not be broadcast again
        assert.equal(licensing.sendLicensing.callCount, 1);
        assert.equal(log.all.callCount, 1);
      }

      {
        const message = {
          from: "licensing",
          topic: "licensing-update",
          subscriptions: {
            b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
              active: true, timestamp: 300
            }
          }
        };

        licensing.updateLicensingData(message);

        assert(config.isAuthorized());

        assert.equal(licensing.sendLicensing.callCount, 2);
        assert.equal(log.all.callCount, 2);
        assert.equal(log.all.lastCall.args[1].event_details, "authorized");
      }

      {
        const message = {
          from: "licensing",
          topic: "licensing-update",
          subscriptions: {
            b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
              active: true, timestamp: 400
            }
          }
        };

        licensing.updateLicensingData(message);

        assert(config.isAuthorized());

        // should not be broadcast again
        assert.equal(licensing.sendLicensing.callCount, 2);
        assert.equal(log.all.callCount, 2);
      }
    });
  });

});


