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

});
