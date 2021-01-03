#!/usr/bin/env python3

import argparse
import platform
import socket
import requests
from gpiozero import Button
import sys
from signal import pause

class bzin:
    @staticmethod
    def SetupParams():
        def get_ip():
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                # doesn't even have to be reachable
                s.connect(('10.255.255.255', 1))
                IP = s.getsockname()[0]
            except Exception:
                IP = '127.0.0.1'
            finally:
                s.close()
            return IP

        parser = argparse.ArgumentParser(description = 'bzin - input hardware controller')
        parser.add_argument('--badgeid', dest = 'badgeid', default = f"{get_ip()}({platform.node()})")
        parser.add_argument('--device', dest = 'device', default = f"UnicornHatMini")
        parser.add_argument('--server', dest = 'server', default = 'localhost')
        parser.add_argument('--port', dest = 'port', default = '8080')
        parser.add_argument('--method', dest = 'method', default = '/api/input')
        return parser.parse_args()

    def on_button(self, button):
        json = {
                    'input' : {
                            'badgeid' : self.args.badgeid
                            , 'device' : self.args.device
                            , 'button' : button.name
                    }
                }
        print(f"[BZin] Button {button.name} pressed")
        print(f"[BZin] OUT:POST {self.serviceUrl}\n{json}")
        r = requests.post(url = self.serviceUrl, json = json)
        print(f"[BZin] OUT:POST RESPONSE {r.status_code} {r.reason}")

    # Inherit from Button to send a button object which includes our name for the button instead of just the pin numebr in the event
    class bzButton(Button):
        def bz_pressed(self, button):
            self.on_button(self)

        def __init__(self, pin, name, on_button):
            self.name = name
            self.on_button = on_button
            Button.__init__(self, pin)
            self.when_pressed = self.bz_pressed

    def __init__(self):
        self.args = bzin.SetupParams()
        self.serviceUrl = f"http://{self.args.server}:{self.args.port}{self.args.method}"
        self.buttons = [
            self.bzButton(5, "A", self.on_button)
            , self.bzButton(6, "B", self.on_button)
            , self.bzButton(16, "X", self.on_button)
            , self.bzButton(24, "Y", self.on_button)
        ]
        print(f"""bzin.py: POSTing button messages to {self.serviceUrl}""")

    def finished(self):
        for button in self.buttons:
            button.close()

try:
    bz = bzin()
    pause()

except KeyboardInterrupt:
    bz.finished()
    sys.exit(0)
