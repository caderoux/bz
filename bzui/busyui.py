#!/usr/bin/env python3

import time
import math
from gpiozero import Button
from signal import pause
import requests
import argparse
import sys
from unicornhatmini import UnicornHATMini
from colorsys import hsv_to_rgb
import json

parser = argparse.ArgumentParser(description = 'bzui - hardware controller')
parser.add_argument('--host', dest='host', default='localhost')
parser.add_argument('--port', dest='port', default='8080')
parser.add_argument('--badge', dest='badgeId', default='1')
parser.add_argument('--status', dest='statusName', default='Free')
args = parser.parse_args()

serviceUrl = f"http://{args.host}:{args.port}/api/badges"

print("""BusyUI: busyui.py

bzui:
A - Busy
B - Free
X/Y - Exit

Press Ctrl+C to exit!

""")

unicornhatmini = UnicornHATMini()
unicornhatmini.set_brightness(0.5)
unicornhatmini.set_rotation(0)
width, height = unicornhatmini.get_shape()

splash_origin = (0, 0)
splash_time = 0

def finished():
    button_a.close()
    button_b.close()
    button_x.close()
    button_y.close()
    sys.exit(0)

def splash(button):
    global splash_origin, splash_time
    button_name, x, y = button_map[button.pin.number]
    splash_origin = (x, y)
    splash_time = time.time()

def setstatus(badgeId, statusName):
    data = { 'badgeId' : badgeId, 'statusName' : statusName }
    headers = {'Content-Type' : 'application/json', 'Accept' : 'application/json'}
    requests.post(url = serviceUrl, json = data, headers = headers)
    # Refresh display

def getstatus():
    data = requests.get(url = serviceUrl).json()
    print(data)
    # Need to process entire status of all badges
    badgeId = data[0]['badgeId']
    statusName = data[0]['statusName']
    print(f"badgeId {badgeId}, statusName {statusName}")
    # Refresh display

def Apressed(button):
    button_name, x, y = button_map[button.pin.number]
    print(f"Button {button_name} pressed!")
    setstatus(args.badgeId, 'Busy')
    splash(button)
    # Refresh display

def Bpressed(button):
    button_name, x, y = button_map[button.pin.number]
    print(f"Button {button_name} pressed!")
    setstatus(args.badgeId, 'Free')
    splash(button)
    # Refresh display

def Xpressed(button):
    button_name, x, y = button_map[button.pin.number]
    print(f"Button {button_name} pressed!")
    finished()

def Ypressed(button):
    button_name, x, y = button_map[button.pin.number]
    print(f"Button {button_name} pressed!")
    getstatus()
    # Refresh display

button_map = {5: ("A", 0, 0), # Top left
              6: ("B", 0, 6), # Bottom Left
              16: ("X", 16, 0), # Top Right
              24: ("Y", 16, 7)} # Bottom Right

button_a = Button(5)
button_b = Button(6)
button_x = Button(16)
button_y = Button(24)

def distance(x1, y1, x2, y2):
    return math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))

setstatus(args.badgeId, args.statusName)

try:
    button_a.when_pressed = Apressed # Set Busy at local server
    button_b.when_pressed = Bpressed # Set Free at local server
    button_x.when_pressed = Xpressed # Exit
    button_y.when_pressed = Ypressed # Exit

    while True:
        if splash_time > 0:
            splash_x, splash_y = splash_origin
            splash_progress = time.time() - splash_time
            for x in range(width):
                for y in range(height):
                    d = distance(x, y, splash_x, splash_y)
                    if (d / 30.0) < splash_progress and splash_progress < 0.6:
                        h = d / 17.0
                        r, g, b = [int(c * 255) for c in hsv_to_rgb(h, 1.0, 1.0)]
                        unicornhatmini.set_pixel(x, y, r, g, b)
                    elif (d / 30.0) < splash_progress - 0.6:
                        unicornhatmini.set_pixel(x, y, 0, 0, 0)

        unicornhatmini.show()

        time.sleep(1.0 / 60.0)

except KeyboardInterrupt:
    finished()
