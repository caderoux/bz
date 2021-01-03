'use strict';

const { Command } = require('commander');
const program = new Command()
  .option('-h, --host <hostname>', 'Server host name', 'localhost')
  .option('-p, --port <port number>', 'Server TCP port', '8080')
  .parse(process.argv);

const http = require('http');

http.get(`http://${program.host}:${program.port}/api/badges`, res => {
  let data = "";

  res.on("data", d => {
    data += d;
  });
  
  res.on("end", () => {
    console.log(data);
  });
});