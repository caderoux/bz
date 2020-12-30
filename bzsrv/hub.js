'use strict';

const http = require('http');

module.exports = class Hub {
    constructor(hubhost, hubport, hubmethod) {
        this.hubhost = hubhost;
        this.hubport = hubport;
        this.hubmethod = hubmethod;
        this.hubUrl = `http://${this.hubhost}:${this.hubport}${this.hubmethod}`;
    }

    Initialize(callback) {
        if ( this.hubhost !== null && this.hubport !== null ) {
            console.log("[BZ] Initializing from hub");
        
            http
                .get(this.hubUrl, res => {
                    let data = "";
            
                    res.on("data", d => {
                        data += d;
                    });
                    res.on("end", () => {
                        console.log(`[BZ] OUT:GET ${this.hubUrl}\n${data}`);
                        callback(JSON.parse(data));
                    });
                });
        }

        return(this);
    }

    Notify(badges) {
        if ( this.hubhost !== null && this.hubport !== null ) {
            let body = JSON.stringify(badges);
            console.log(`[BZ] OUT:POST ${this.hubUrl}\n${body}`);
    
            let options = {
                hostname: this.hubhost,
                port: this.hubport,
                path: this.hubmethod,
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
                        console.log(`[BZ] OUT:POST RESPONSE ${data}`);
                    });
                })
                .on("error", console.error)
                .end(body);
        }
    }
}