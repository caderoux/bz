'use strict';

var badges = [];

const { Command } = require('commander');
const program = new Command();

program
    .option('-p, --port <port number>', 'TCP port for service', '8888');

program.parse(process.argv);

const express = require('express');
const app = express();
app.use(express.json());

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
    res.send('<h1>This is bzhub</h1><p>' + JSON.stringify(badges) + '</p>');
});
     
app.get('/api/badges', (req, res)=> {
    res.send(badges);
});

app.post('/api/badges', (req, res)=> {
    console.log("Badge received:");
    console.log(JSON.stringify(req.body));
    setStatus(req.body);
    res.send(badges);
});

app.listen(program.port, () => console.log(`Listening on port ${program.port}...`));