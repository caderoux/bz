'use strict';

var badges = [];

const { Command } = require('commander');
const program = new Command();

program
.option('-h, --host <hostname>', 'Server host name', 'localhost')
.option('-p, --port <port number>', 'Server TCP port', '8080')
.option('-id, --badgeid <url>', 'Badge identifier', 'http://localhost')
.option('-s, --status <status text>', 'Status text', 'Busy')
;

program.parse(process.argv);

const http = require('http');

let body = JSON.stringify({ badgeId : program.badgeid, statusName : program.status });
  
let options = {
    hostname: program.host,
    port: program.port,
    path: "/api/badges",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
    }
};

http
  .request(options, res => {
    let data = ""
    res.on("data", d => {
      data += d;
    })
    res.on("end", () => {
      console.log(data);
    })
  })
  .on("error", console.error)
  .end(body);