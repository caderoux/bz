'use strict';

var IsMaster = false;
var badges = [];
var pingedMaster = false;

const http = require('http');

const { Command } = require('commander');
const program = new Command();

program
    .option('-hh, --hubhost <hostname>', 'Hub host name', null)
    .option('-hp, --hubport <port number>', 'Hub server TCP port', null)
    .option('-h, --hostname <host name>', 'Host name', null)
    .option('-c, --clusterport <port number>', 'TCP port for cluster', '12345')
    .option('-p, --port <port number>', 'TCP port for service', '8080');

program.parse(process.argv);

if ( program.hubhost !== null && program.hubport !== null ) {
    console.log("Initializing from hub");

    http.get(`http://${program.hubhost}:${program.hubport}/api/badges`, res => {
        let data = "";

        res.on("data", d => {
            data += d;
        });
        res.on("end", () => {
            console.log(data);
            let badges = JSON.parse(data);
            badges.forEach(badge => { setStatus(badge); });
        });
    });
}

const express = require('express');
const app = express();
app.use(express.json());

const Discover = require('node-discover');
const clusteropts = { port : program.clusterport, hostname : program.hostname };
const d = Discover();

function watchInit(data) {
    if ( IsMaster ) {
        console.log("badge-init received - sending master data out:");
        d.send('badge-init', {operation : 'response', badges: badges});
    }
    else {
        if ( typeof data !== 'undefined' && data.badges !== undefined ) {
            console.log("badge-init received - accepting master data:");
            console.log(JSON.stringify(data.badges));
            data.badges.forEach(badge => { setStatus(badge); });
        }
        d.leave('badge-init');
    }
}

d.on("promotion", () => {
    IsMaster = true;
	console.log("I was promoted to a master.");
    var success = d.join("badge-init", watchInit);
});

d.on("demotion", () => {
    IsMaster = false;
    console.log("I was demoted from being a master.");
    d.leave('badge-init');
});

var success = d.join("badge-changes", data => {
    if ( typeof data !== 'undefined' && data.badges !== undefined ) {
        console.log("badge-changes received:");
        console.log(JSON.stringify(data.badges));
        data.badges.forEach(badge => {
            setStatus(badge);
            if ( IsMaster && program.hubhost !== null && program.hubport !== null ) {
                console.log("Sending upstream:");
        
                let body = JSON.stringify(badge);
                console.log(body);
        
                let options = {
                    hostname: program.hubhost,
                    port: program.hubport,
                    path: "/api/badges",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(body)
                    }
                };
                
                http
                    .request(options, res => {
                        let data = "";
                        res.on("data", d => {
                            data += d;
                        })
                        res.on("end", () => {
                            console.log(data);
                        })
                    })
                    .on("error", console.error)
                    .end(body);
            }
        });
    }
});

setTimeout(() => {
    if ( !IsMaster ) {
        console.log("Still not master, joining badge-init:");
        d.join("badge-init", watchInit);
        console.log("Requesting badge-init:");
        d.send('badge-init', {operation: 'request', badges: []});
    }
}, 5000);

function setStatus(badge) {
    console.log("Searching for badge:");
    console.log(JSON.stringify(badge));
    let obj = badges.find((o, i, a) => {
        console.log("Inspecting badge:");
        console.log(JSON.stringify(o));
        if (o.badgeId === badge.badgeId) {
            console.log("Replacing badge:");
            console.log(JSON.stringify(badge));
            badges[i] = badge;
            return true; // stop searching
        }
    });
    if ( obj === undefined ) {
        console.log("Adding badge:");
        console.log(JSON.stringify(badge));
        badges.push(badge);
    }
}

app.get('/', (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send('<h1>This is bzsrv</h1><p>' + JSON.stringify(badges) + '</p>');
});
     
app.get('/api/badges', (req, res) => {
    res.send(badges);
});

app.post('/api/badges', (req, res) => {
    console.log("Badge received:");
    let badge = req.body;
    let body = JSON.stringify(badge);
    console.log(body);
    setStatus(badge);
    d.send('badge-changes', {badges: [badge]});

    if ( IsMaster && program.hubhost !== null && program.hubport !== null ) {
        console.log("Sending upstream:");

        let body = JSON.stringify(badge);
        console.log(body);

        let options = {
            hostname: program.hubhost,
            port: program.hubport,
            path: "/api/badges",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        };
        
        http
            .request(options, res => {
                let data = "";
                res.on("data", d => {
                    data += d;
                })
                res.on("end", () => {
                    console.log(data);
                })
            })
            .on("error", console.error)
            .end(body);
    }
    res.send(badges);
});

app.listen(program.port, () => console.log(`Listening on port ${program.port}...`));
