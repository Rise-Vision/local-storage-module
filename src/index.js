const database = require("./db/lokijs/database"),
  messaging = require("./messaging/messaging");

global.secondMillis = 1000;

database.start()
  .then(messaging.init)
  .catch((err)=>{
    console.log(err);
  });
