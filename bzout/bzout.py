#!/usr/bin/env python3

import argparse
from flask import Flask, request
from unicornhatmini import UnicornHATMini
import json

parser = argparse.ArgumentParser(description = 'bzout - hardware output controller')
parser.add_argument('--port', dest='port', default='8081')
parser.add_argument('--brightness', dest='brightness', type=float, default=0.5)
args = parser.parse_args()

class Display:
    def __init__(self, brightness):
        self.hat = UnicornHATMini()
        self.hat.set_brightness(brightness)
        self.hat.set_rotation(0)
        self.width, self.height = self.hat.get_shape()
        print(f"""[BZout] Screen initialized {self.width}x{self.height}, brightness {brightness}""")

    def display(self, pixels):
        ilen = len(pixels)
        for lp in range(self.width * self.height):
            (x, y) = (lp % self.width, lp // self.width)
            [r, g, b] = pixels[lp % ilen]
            self.hat.set_pixel(x, y, r, g, b)
        self.hat.show()

d = Display(args.brightness)
app = Flask(__name__)

@app.route('/display', methods=['POST'])
def setDisplay():
    print(f"""[BZout] IN:POST {request.path}\n{request.data}""")
    d.display(request.json['pixels'])
    return 'OK'

if __name__ == '__main__':
    app.run(host = "localhost", port = args.port, debug = True)