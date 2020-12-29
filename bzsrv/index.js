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
    .option('-hm, --hubmethod <method>', 'Hub method', '/api/badges')
    .option('-cp, --clusterport <port number>', 'TCP port for cluster', '12345')
    .option('-p, --port <port number>', 'TCP port for service', '8080')
    .option('-dh, --displayhost <display host name>', 'Display host name', '127.0.0.1')
    .option('-dd, --displayport <port number>', 'TCP port for display', '8081')
    .option('-dm, --displaymethod <display method>', 'Display method', '/display')
;

program.parse(process.argv);

const http = require('http');

function InitializeFromHub() {
    if ( program.hubhost !== null && program.hubport !== null ) {
        var hubUrl = `http://${program.hubhost}:${program.hubport}${program.hubmethod}`;
        console.log("[BZ] Initializing from hub");
    
        http.get(hubUrl, res => {
            let data = "";
    
            res.on("data", d => {
                data += d;
            });
            res.on("end", () => {
                console.log(`[BZ] OUT:GET ${hubUrl}
${data}`);
                let badges = JSON.parse(data);
                badges.forEach(badge => {
                    setStatus(badge);
                });
            });
        });
    }
}

const express = require('express');
const app = express();
app.use(express.json());

let discover_options = {port : program.clusterport};

const Discover = require('node-discover');
const d = Discover(discover_options);

function watchInit(data) {
    if ( IsMaster ) {
        console.log(`[Discover] IN:badge-init (Master)
${JSON.stringify({operation : 'response', badges: badges})}`);
        d.send('badge-init', {operation : 'response', badges: badges});
    }
    else {
        if ( typeof data !== 'undefined' && data.badges !== undefined ) {
            console.log(`[Discover] IN:badge-init
${JSON.stringify(data.badges)}`);
            data.badges.forEach(badge => {
                setStatus(badge);
            });
        }
        d.leave('badge-init');
    }
}

d.on("promotion", () => {
    IsMaster = true;
	console.log("[Discover] Promoted to master");
    badges.forEach(badge => {
        NotifyHub(badge);
    });
    var success = d.join("badge-init", watchInit);
});

d.on("demotion", () => {
    IsMaster = false;
    console.log("[Discover] Demoted from master");
    d.leave('badge-init');
});

function NotifyHub(badge) {
    if ( IsMaster && program.hubhost !== null && program.hubport !== null ) {
        var hubUrl = `http://${program.hubhost}:${program.hubport}${program.hubmethod}`;
        let body = JSON.stringify(badge);
        console.log(`[BZ] OUT:POST ${hubUrl}
${body}`);

        let options = {
            hostname: program.hubhost,
            port: program.hubport,
            path: program.hubmethod,
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
                    console.log(`[BZ] OUT:POST RESPONSE ${data}`);
                })
            })
            .on("error", console.error)
            .end(body);
    }
}

var success = d.join("badge-changes", data => {
    if ( typeof data !== 'undefined' && data.badges !== undefined ) {
        console.log(`[Discover] IN:badge-changes
${JSON.stringify(data.badges)}`);
        data.badges.forEach(badge => {
            setStatus(badge);
            NotifyHub(badge);
        });
    }
    else {
        console.log(`[Discover] IN:badge-changes
${data}
`);
    }
});

setTimeout(() => {
    if ( !IsMaster ) {
        d.join("badge-init", watchInit);
        console.log(`[Discover] OUT:badge-init
${JSON.stringify({operation: 'request', badges: []})}`);
        d.send('badge-init', {operation: 'request', badges: []});
    }
}, 5000);

function UpdateDisplay() {
    let display = {};
    let badge = badges.find((o) => { return (o.badgeId == program.badgeid) ; });
    if (badge) {
        if ( badge.statusName == 'Busy' ) {
            display.pixels = [ [255, 0, 0] ];
        }
        else if ( badge.statusName == 'Free' ) {
            display.pixels = [ [0, 255, 0] ];
        }
        else if ( badge.statusName == 'Off' ) {
            display.pixels = [ [0, 0, 0] ];
        }
        else {
            display.pixels = [ [255, 0, 0], [0, 255, 0], [0, 0, 255] ];
        }
    
        let body = JSON.stringify(display);
        let displayUrl = `${program.displayhost}:${program.displayport}${program.displaymethod}`;
        let options = {
            hostname: program.displayhost,
            port: program.displayport,
            path: program.displaymethod,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        };
    
        console.log(`[BZ] OUT:POST ${displayUrl}
${body}`);
    
        http
            .request(options, res => {
                let data = "";
                res.on("data", d => {
                    data += d;
                })
                res.on("end", () => {
                    console.log(`[BZ] OUT:POST RESPONSE ${data}`);
                })
            })
            .on("error", console.error)
            .end(body);
    }
}

function setStatus(badge) {
    let obj = badges.find((o, i, a) => {
        if (o.badgeId === badge.badgeId) {
            badges[i] = badge;
            return true;
        }
    });
    if ( obj === undefined ) {
        badges.push(badge);
    }
    UpdateDisplay();
}

function ProcessBadgeChange(badge) {
    setStatus(badge);
    console.log(`[Discover] OUT:badge-change
${JSON.stringify({ badges: [badge] })}`)
    d.send('badge-changes', { badges: [badge] });
    NotifyHub(badge);
}

app.get('/', (req, res) => {
    console.log(`[BZ] IN:GET ${req.url}`);
    res.set('Content-Type', 'text/html');
    res.send('<h1>This is bzsrv</h1><p>' + JSON.stringify(badges) + '</p>');
});
     
app.get('/api/badges', (req, res) => {
    console.log(`[BZ] IN:GET ${req.url}`);
    res.send(badges);
});

app.post('/api/badges', (req, res) => {
    console.log(`[BZ] IN:POST ${req.url}
${JSON.stringify(req.body)}`);

    let badge = req.body;
    ProcessBadgeChange(badge);

    res.send(badges);
});

app.post('/api/input', (req, res) => {
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
    
    console.log(`[BZ] IN:POST ${req.url}
${JSON.stringify(req.body)}`);

    let badge = GetBadge(req.body.input);
    ProcessBadgeChange(badge);

    res.send(badges);
});

console.log(`[BZ] Badge ID: ${program.badgeid}`);
InitializeFromHub();
app.listen(program.port, () => console.log(`[BZ] Listening on port ${program.port}`));
