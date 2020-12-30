'use strict';

const os = require("os");
const ip = require("ip");
const { Command } = require('commander');
const express = require('express');
const Discover = require('node-discover');
const Hub = require('./hub.js');
const Display = require('./display.js');
const events = require('events');

var bzsrv = {
    SetupParams : function() {
        this.params = new Command()
            .option('-b, --badgeid <badge id>', 'Badge Identifier', `${ip.address()}(${os.hostname()})`)
            .option('-p, --port <port number>', 'TCP port for service', '8080')
            .option('-hh, --hubhost <hub host name>', 'Hub host name', null)
            .option('-hp, --hubport <port number>', 'Hub server TCP port', 8888)
            .option('-hm, --hubmethod <method>', 'Hub method', '/api/badges')
            .option('-cp, --clusterport <port number>', 'TCP port for cluster', '12345')
            .option('-dh, --displayhost <display host name>', 'Display host name', '127.0.0.1')
            .option('-dd, --displayport <port number>', 'TCP port for display', '8081')
            .option('-dm, --displaymethod <display method>', 'Display method', '/display')
            .parse()
        ;
        console.log(`[BZ] Badge ID: ${this.params.badgeid}`);

        return(this);
    }
    , SetupHub : function() {
        this.hub = new Hub(this.params.hubhost, this.params.hubport, this.params.hubmethod)
            .Initialize(this.UpdateBadgeStatus.bind(this))
        ;

        return(this);
    }
    , SetupWebServer : function() {
        this.app = express();
        this.app.use(express.json());

        this.app.get('/', (req, res) => {
            console.log(`[BZ] IN:GET ${req.url}`);
            res.set('Content-Type', 'text/html');
            res.send('<h1>This is bzsrv</h1><p>' + JSON.stringify(this.state.badges) + '</p>');
        });
            
        this.app.get('/api/badges', (req, res) => {
            console.log(`[BZ] IN:GET ${req.url}`);
            res.send(this.state.badges);
        });
        
        this.app.post('/api/badges', (req, res) => {
            console.log(`[BZ] IN:POST ${req.url}\n${JSON.stringify(req.body)}`);
        
            this.ProcessBadgeChange(req.body);
        
            res.send(this.state.badges);
        });
        
        this.app.post('/api/input', (req, res) => {
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
            
            console.log(`[BZ] IN:POST ${req.url}\n${JSON.stringify(req.body)}`);
        
            this.ProcessBadgeChange(GetBadge(req.body.input));
        
            res.send(this.state.badges);
        });

        return(this);
    }
    , SetupDisplay : function() {
        this.display = new Display(17, 7, this.params.displayhost, this.params.displayport, this.params.displaymethod);

        return(this);
    }
    , SetupDiscovery : function() {
        this.discover = Discover({port : this.params.clusterport});
        
        this.discover.on("promotion", () => {
            this.state.IsMaster = true;
            console.log("[Discover] Promoted to master");
            if ( this.state.IsMaster ) { this.hub.Notify(this.state.badges) ; }
            var success = this.discover.join("badge-init", this.watchInit.bind(this));
        });
        
        this.discover.on("demotion", () => {
            this.state.IsMaster = false;
            console.log("[Discover] Demoted from master");
            this.discover.leave('badge-init');
        });
        
        var success = this.discover.join("badge-changes", data => {
            if ( typeof data !== 'undefined' && data.badges !== undefined ) {
                console.log(`[Discover] IN:badge-changes\n${JSON.stringify(data.badges)}`);
                this.UpdateBadgeStatus(data.badges);
                if ( this.state.IsMaster ) { this.hub.Notify(data.badges) ; }
            }
            else {
                console.log(`[Discover] IN:badge-changes\n${data}`);
            }
        });

        setTimeout(() => {
            if ( !this.state.IsMaster ) {
                this.discover.join("badge-init", this.watchInit.bind(this));
                console.log(`[Discover] OUT:badge-init\n${JSON.stringify({operation: 'request', badges: []})}`);
                this.discover.send('badge-init', {operation: 'request', badges: []});
            }
        }, 5000);

        return(this);
    }
    , state: {
        IsMaster: false
        , badges: []
    }
    , constants: {
        BadgeColor: {
            "Off" : [0, 0, 0]
            , "Busy" : [255, 0, 0]
            , "Free" : [0, 255, 0]
            , "Red" : [255, 0, 0]
            , "Green" : [0, 255, 0]
            , "Blue" : [0, 0, 255]
        }
    }
    , currentbadge : function() {
        return(this.state.badges.find((o) => { return (o.badgeId == this.params.badgeid) ; }));
    }
    , UpdateDisplay : function() {
        let badge = this.currentbadge();
        if (badge) {
            if (this.constants.BadgeColor[badge.statusName]) {
                this.display.SetAll(this.constants.BadgeColor[badge.statusName]);
            }
            else {
                this.display.RepeatPattern([ [255, 0, 0], [0, 255, 0], [0, 0, 255] ]);
            }
    
            let tl = [this.display.width - 1, 0];
            this.state.badges.forEach(badge => {
                if ( badge.badgeId != this.params.badgeid && this.constants.BadgeColor[badge.statusName] ) {
                    let br = [tl[0] + 1, tl[1] + this.display.height];
                    this.display.FillRectangle(tl, br, this.constants.BadgeColor[badge.statusName]);
                    tl[0]--;
                }
            });
    
            this.display.Refresh();
        }
    }
    , UpdateBadgeStatus : function(badges) {
        if ( !Array.isArray(badges) ) {
            badges = [badges];
        }
        badges.forEach(badge => {
            let obj = this.state.badges.find((o, i, a) => {
                if (o.badgeId === badge.badgeId) {
                    this.state.badges[i] = badge;
                    return true;
                }
            });
            if ( obj === undefined ) {
                this.state.badges.push(badge);
            }
        });
        this.UpdateDisplay();
    }
    , watchInit : function(data) {
        if ( this.state.IsMaster ) {
            console.log(`[Discover] IN:badge-init (Master)\n${JSON.stringify({operation : 'response', badges: this.state.badges})}`);
            this.discover.send('badge-init', {operation : 'response', badges: this.state.badges});
        }
        else {
            if ( typeof data !== 'undefined' && data.badges !== undefined ) {
                console.log(`[Discover] IN:badge-init\n${JSON.stringify(data.badges)}`);
                this.UpdateBadgeStatus(data.badges);
            }
            this.discover.leave('badge-init');
        }
    }
    , ProcessBadgeChange : function(badges) {
        if ( !Array.isArray(badges) ) {
            badges = [badges];
        }
        this.UpdateBadgeStatus(badges);
        console.log(`[Discover] OUT:badge-change\n${JSON.stringify({ badges: badges })}`)
        this.discover.send('badge-changes', { badges: badges });
        if ( this.state.IsMaster ) { this.hub.Notify(badges) ; }
    }
    , Listen : function() {
        this.app.listen(this.params.port, () => console.log(`[BZ] Listening on port ${this.params.port}`));
    }
};

bzsrv
    .SetupParams()
    .SetupWebServer()
    .SetupDisplay()
    .SetupDiscovery()
    .SetupHub()
    .Listen()
;