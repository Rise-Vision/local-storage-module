const database = require("./db/lokijs/database"),
  messaging = require("./messaging");

database.start()
  .then(messaging.init)
  .catch((err)=>{
    console.log(err);
  });

