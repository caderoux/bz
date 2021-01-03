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

    class bzbutton:
        def button_pressed(self, button):
            json = {'input' : {
                                'badgeid' : self.parent.args.badgeid
                                , 'device' : self.parent.args.device
                                , 'button' : self.name
                                }
                    }
            print(f"[BZin] Button {self.name} pressed")
            print(f"[BZin] OUT:POST {self.parent.serviceUrl}\n{json}")
            r = requests.post(url = self.parent.serviceUrl, json = json)
            print(f"[BZin] OUT:POST RESPONSE {r.status_code} {r.reason}")

        def __init__(self, parent, pin, name):
            self.parent = parent
            self.name = name
            self.button = Button(pin)
            self.button.when_pressed = self.button_pressed.__get__(self, self.__class__)

        def close(self):
            self.button.close()

    def __init__(self):
        self.args = bzin.SetupParams()
        self.serviceUrl = f"http://{self.args.server}:{self.args.port}{self.args.method}"
        self.buttons = [
            self.bzbutton(self, 5, "A")
            , self.bzbutton(self, 6, "B")
            , self.bzbutton(self, 16, "X")
            , self.bzbutton(self, 24, "Y")
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
