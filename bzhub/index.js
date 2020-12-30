'use strict';

const { Command } = require('commander');
const express = require('express');
const fs = require('fs');

var bzhub = {
    badges : []
    , SetupParams : function() {
        this.params = new Command()
            .option('-p, --port <port number>', 'TCP port for service', '8888')
            .option('-bf, --badgefile <badge file>', 'JSON file for badge persistance', './badges.json')
            .parse();

        return(this);
    }
    , SetupWebServer : function() {
        this.app = express();
        this.app.use(express.json());

        this.app.get('/', (req, res) => {
            console.log(`[BZhub] IN:GET ${req.url}`);
            res.set('Content-Type', 'text/html');
            res.send(`<h1>This is bzhub</h1><p>${JSON.stringify(this.badges)}</p>`);
        });
             
        this.app.get('/api/badges', (req, res)=> {
            console.log(`[BZhub] IN:GET ${req.url}\n${JSON.stringify(this.badges)}`);
            res.send(this.badges);
        });
        
        this.app.post('/api/badges', (req, res)=> {
            console.log(`[BZhub] IN:POST ${req.url}\n${JSON.stringify(req.body)}`);
        
            this.UpdateBadgeStatus(req.body);
        
            this.Persist();
        
            res.send(this.badges);
        });

        return(this);
    }
    , UpdateBadgeStatus : function(badges) {
        if ( !Array.isArray(badges) ) {
            badges = [badges];
        }
        badges.forEach(badge => {
            let obj = this.badges.find((o, i, a) => {
                if (o.badgeId === badge.badgeId) {
                    this.badges[i] = badge;
                    return true;
                }
            });
            if ( obj === undefined ) {
                this.badges.push(badge);
            }
        });
    }
    , Persist : function() {
        fs.writeFile(this.params.badgefile, JSON.stringify(this.badges), 'utf8', function(err) {
            if (err) {
                console.log(err);
            }
        });
    }
    , Retrieve : function() {
        if (fs.existsSync(this.params.badgefile)) {
            console.log(`[BZhub] Loading badges from file ${this.params.badgefile}`);
            fs.readFile(this.params.badgefile, 'utf8', (err, data) => {
                if (err) {
                    console.log(err);
                }
                else {
                    this.badges = JSON.parse(data);
                    console.log(`${JSON.stringify(this.badges)}`);
                }
            });
        }

        return(this);
    }
    , Listen : function() {
        this.app.listen(this.params.port, () => console.log(`[BZhub] Listening on port ${this.params.port}`));

        return(this);
    }
};

bzhub
    .SetupParams()
    .SetupWebServer()
    .Retrieve()
    .Listen();
;
