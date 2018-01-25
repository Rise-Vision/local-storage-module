const database = require("./db/lokijs/database"),
  messaging = require("./messaging/messaging");

const {spawn} = require('child_process');

database.start()
  .then(()=>{
    messaging.init();
    const node = spawn("node_modules/ipfs/src/cli/bin.js", ["daemon"]);
    node.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
  })
  .catch((err)=>{
    console.log(err);
  });
