#!/usr/bin/env python3

import argparse
from gpiozero import Button
import sys
import requests
from signal import pause
import platform
import socket

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
args = parser.parse_args()
serviceUrl = f"http://{args.server}:{args.port}{args.method}"

print(f"""bzin.py: POSTing button messages to {serviceUrl}, press Ctrl+C to exit""")

button_map = {
    5: { 'name' : "A" }
    , 6: { 'name' : "B" }
    , 16: { 'name' : "X" }
    , 24: { 'name' : "Y" }
}

def init():
    for pin, obj in button_map.items():
        obj['pin'] = pin
        obj['button'] = Button(pin)
        obj['button'].when_pressed = button_pressed

def finished():
    for button in button_map.values():
        button['button'].close()
    sys.exit(0)

def button_pressed(button):
    button_name = button_map[button.pin.number]['name']
    json = {'input' : {'badgeid' : args.badgeid, 'device' : args.device, 'button' : button_name}}
    print(f"[BZin] Button {button_name} pressed")
    print(f"[BZin] OUT:POST {serviceUrl} {json}")
    r = requests.post(url = serviceUrl, json = json)
    print(r.status_code, r.reason)

try:
    init()

    pause()

except KeyboardInterrupt:
    finished()
