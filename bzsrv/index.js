'use strict';

var IsMaster = false;
var badges = [];

const os = require("os");
var hostname = os.hostname();
const ip = require("ip");
var ipaddress = ip.address();

const { Command } = require('commander');
const program = new Command();

program
    .option('-b, --badgeid <badge id>', 'Badge Identifier', `${ipaddress}(${hostname})`)
    .option('-hh, --hubhost <hub host name>', 'Hub host name', null)
    .option('-hp, --hubport <port number>', 'Hub server TCP port', 8888)
    .option('-cp, --clusterport <port number>', 'TCP port for cluster', '12345')
    .option('-p, --port <port number>', 'TCP port for service', '8080')
    .option('-dh, --displayhost <display host name>', 'Display host name', '127.0.0.1')
    .option('-dd, --displayport <port number>', 'TCP port for display', '8081')
;

program.parse(process.argv);

const http = require('http');

if ( program.hubhost !== null && program.hubport !== null ) {
    console.log("[BZ] Initializing from hub");

    http.get(`http://${program.hubhost}:${program.hubport}/api/badges`, res => {
        let data = "";

        res.on("data", d => {
            data += d;
        });
        res.on("end", () => {
            console.log(`[BZ] OUT:GET http://${program.hubhost}:${program.hubport}/api/badges
${data}`);
            let badges = JSON.parse(data);
            badges.forEach(badge => {
                setStatus(badge);
            });
        });
    });
}

const express = require('express');
const app = express();
app.use(express.json());

let discover_options = {port : program.clusterport};

const Discover = require('node-discover');
const d = Discover(discover_options);

function watchInit(data) {
    if ( IsMaster ) {
        console.log(`[Discover] badge-init received - sending master data out: ${{operation : 'response', badges: badges}}`);
        d.send('badge-init', {operation : 'response', badges: badges});
    }
    else {
        if ( typeof data !== 'undefined' && data.badges !== undefined ) {
            console.log("[Discover] badge-init received - accepting master data:");
            console.log("[Discover] " + JSON.stringify(data.badges));
            data.badges.forEach(badge => {
                setStatus(badge);
            });
        }
        d.leave('badge-init');
    }
}

d.on("promotion", () => {
    IsMaster = true;
	console.log("[Discover] I was promoted to a master.");
    var success = d.join("badge-init", watchInit);
});

d.on("demotion", () => {
    IsMaster = false;
    console.log("[Discover] I was demoted from being a master.");
    d.leave('badge-init');
});

var success = d.join("badge-changes", data => {
    console.log("[Discover] badge-changes received:");
    if ( typeof data !== 'undefined' && data.badges !== undefined ) {
        console.log("[Discover] " + JSON.stringify(data.badges));
        data.badges.forEach(badge => {
            setStatus(badge);
            if ( IsMaster && program.hubhost !== null && program.hubport !== null ) {
                console.log("[Discover] Sending upstream:");
        
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
    else {
        console.log(`[Discover] data:
${data}
`);
    }
});

setTimeout(() => {
    if ( !IsMaster ) {
        console.log("[Discover] Still not master, joining badge-init:");
        d.join("badge-init", watchInit);
        console.log(`[Discover] Requesting badge-init: ${{operation: 'request', badges: []}}`);
        d.send('badge-init', {operation: 'request', badges: []});
    }
}, 5000);

function setStatus(badge) {
    if ( badge.badgeId === program.badgeid ) {
        UpdateDisplay(badge);
    }
    let obj = badges.find((o, i, a) => {
        if (o.badgeId === badge.badgeId) {
            badges[i] = badge;
            return true;
        }
    });
    if ( obj === undefined ) {
        badges.push(badge);
    }
}

function ProcessBadgeChange(badge) {
    setStatus(badge);
    console.log(`[Discover] Broadcast badge-change: ${{ badges: [badge] }}`)
    d.send('badge-changes', { badges: [badge] });

    if (IsMaster && program.hubhost !== null && program.hubport !== null) {
        console.log("[BZ] Sending upstream:");

        let body = JSON.stringify(badge);

        console.log(`[BZ] OUT:POST http://${program.hubhost}:${program.hubport}/api/badges
${body}`);
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
                });
                res.on("end", () => {
                    console.log(data);
                });
            })
            .on("error", console.error)
            .end(body);
    }
}

app.get('/', (req, res) => {
    console.log(`[BZ] IN:GET /`);
    res.set('Content-Type', 'text/html');
    res.send('<h1>This is bzsrv</h1><p>' + JSON.stringify(badges) + '</p>');
});
     
app.get('/api/badges', (req, res) => {
    console.log(`[BZ] IN:GET /api/badges`);
    res.send(badges);
});

app.post('/api/badges', (req, res) => {
    console.log(`[BZ] IN:POST /api/badges
${JSON.stringify(req.body)}`);

    let badge = req.body;
    ProcessBadgeChange(badge);

    res.send(badges);
});

function GetBadge(input) {
    let buttons = {
        'A' : { statusName : 'Busy' }
        , 'B' : { statusName : 'Free' }
        , 'X' : { statusName : 'Off' }
        , 'Y' : { statusName : 'Custom' }
    };

    return {
        badgeId : input.badgeid
        , statusName : buttons[input.button].statusName
    }
};

function UpdateDisplay(badge) {
    if ( badge.statusName == 'Busy' ) {
        badge.pixels = [ [255, 0, 0] ];
    }
    else if ( badge.statusName == 'Free' ) {
        badge.pixels = [ [0, 255, 0] ];
    }
    else if ( badge.statusName == 'Off' ) {
        badge.pixels = [ [0, 0, 0] ];
    }
    else {
        badge.pixels = [ [255, 0, 0], [0, 255, 0], [0, 0, 255] ];
    }

    let body = JSON.stringify(badge);
    let options = {
        hostname: program.displayhost,
        port: program.displayport,
        path: "/display",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
        }
    };

    console.log(`[BZ] OUT:POST ${program.displayhost}:${program.displayport}${options.path}
${body}`);

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

app.post('/api/input', (req, res) => {
    console.log(`[BZ] IN:POST /api/input
${JSON.stringify(req.body)}`);

    let badge = GetBadge(req.body.input);
    ProcessBadgeChange(badge);

    res.send(badges);
});

console.log(`[BZ] Badge ID: ${program.badgeid}`);
app.listen(program.port, () => console.log(`[BZ] Listening on port ${program.port}...`));

