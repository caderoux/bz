'use strict';

const http = require('http');

module.exports = class Display {
    constructor(width, height, displayhost, displayport, displaymethod) {
        this.width = width;
        this.height = height;
        this.displayhost = displayhost;
        this.displayport = displayport;
        this.displaymethod = displaymethod;
        this.displayUrl = `${this.displayhost}:${this.displayport}${this.displaymethod}`;
        this.display = [];

        for ( let iLp = 0 ; iLp < this.width ; iLp++ ) {
            this.display[iLp] = [];
            for ( let jLp = 0 ; jLp < this.height ; jLp++ ) {
                this.display[iLp][jLp] = [0, 0, 0];
            }
        }
    }

    RepeatPattern(pixels) {
        let ilen = pixels.length;
        for ( let pLp = 0 ; pLp < this.width * this.height ; pLp++ ) {
            let x = pLp % this.width;
            let y = Math.trunc(pLp / this.width);
            this.display[x][y] = pixels[pLp % ilen];
        }
    }

    SetAll(rgb) {
        this.RepeatPattern([rgb]);
    }

    SetPixel(x, y, rgb) {
        this.display[x][y] = rgb;
    }

    FillRectangle(tl, br, rgb) {
        for ( let xLp = tl[0] ; xLp < br[0] ; xLp++ ) {
            for ( let yLp = tl[1] ; yLp < br[1] ; yLp++ ) {
                this.display[xLp][yLp] = rgb;
            }
        }
    }

    GetPixels() {
        let pixels = [];
        for ( let pLp = 0 ; pLp < this.width * this.height ; pLp++ ) {
            pixels.push(this.display[pLp % this.width][Math.trunc(pLp / this.width)]);
        }
    
        return(pixels);
    }    

    Refresh() {
        let body = JSON.stringify({ "pixels" : this.GetPixels() });
        let options = {
            hostname: this.displayhost,
            port: this.displayport,
            path: this.displaymethod,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        };
    
        console.log(`[BZ] OUT:POST ${this.displayUrl}
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
