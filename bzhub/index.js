'use strict';

var bzhub = {
    badges: []
};

const { Command } = require('commander');
const program = new Command();
program
    .option('-p, --port <port number>', 'TCP port for service', '8888')
    .option('-bf, --badgefile <badge file>', 'JSON file for badge persistance', './badges.json')
;
program.parse(process.argv);

const express = require('express');
const app = express();
app.use(express.json());

const fs = require('fs');

function setStatus(badge) {
    let obj = bzhub.badges.find((o, i, a) => {
        if (o.badgeId === badge.badgeId) {
            bzhub.badges[i] = badge;
            return true;
        }
    });
    if ( obj === undefined ) {
        bzhub.badges.push(badge);
    }
    fs.writeFile(program.badgefile, JSON.stringify(bzhub.badges), 'utf8', function(err) {
        if (err) {
            console.log(err);
        }
    });
}

app.get('/', (req, res) => {
    console.log(`[BZhub] IN:GET /`);
    res.set('Content-Type', 'text/html');
    res.send('<h1>This is bzhub</h1><p>' + JSON.stringify(bzhub.badges) + '</p>');
});
     
app.get('/api/badges', (req, res)=> {
    console.log(`[BZhub] IN:GET /api/badges`);
    res.send(bzhub.badges);
});

app.post('/api/badges', (req, res)=> {
    console.log(`[BZhub] IN:POST /api/badges
${JSON.stringify(req.body)}`);

    setStatus(req.body);

    res.send(bzhub.badges);
});

if (fs.existsSync(program.badgefile)) {
    console.log(`[BZhub] Loading badges from file ${program.badgefile}`);
    fs.readFile(program.badgefile, 'utf8', function(err, data) {
        if (err) {
            console.log(err);
        }
        else {
            bzhub.badges = JSON.parse(data);
            console.log(`${JSON.stringify(bzhub.badges)}`);
        }
    });
}

app.listen(program.port, () => console.log(`[BZhub] Listening on port ${program.port}`));