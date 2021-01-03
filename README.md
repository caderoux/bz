# bz

A flexible, expandable, low-configuration "busylights" system for household network where each station or "badge" is able to identify and display or otherwise notify a "busy" or "free" state in the physical world - nominally through a lighting system, either outside of a home office or on top of a monitor in an open workspace.

Initial proof-of-concept hardware implementation is a Raspberry Pi Zero with a UnicornHatMini hat which provides input buttons and output display in a single convenient form factor for testing and exploration.

This configuration is only appropriate for mounting within arms reach or perhaps on the outside of a meeting room where you would access the buttons directly to set the room free/or busy on the way into or out of a room.

However, with the micro-services implementation, it is possible to relatively easily expand this system and the system will be evolving to accomodate many modes of operation.

Many capabilities are already available within the web services as they are in the initial proof-of-concept - for instance GET from any bzsrv or a bzhub can be used to drive an "airport-terminal" type display of all stations' status.

See the [Roadmap](#roadmap)

# Components and architecture

bz uses a number of components in Node.js and Python - see each component for description of its dependencies and design considerations.

The components communicate exclusively through network protocols, either web service requests or through their discovery protocol.

## bzsrv

Core station service, defines the identity of a badge or station - Node.js Express application

Uses node-discover to broadcast and assign a master, also broadcast to notify of badge changes.  Each station currently keeps track of all stations and any station can provide a list if it is elected as master.  When a station is elected as master, it will respond to init requests on the channel for any new stations that come online.

When a change is detected instatus of stations, bzsrv will notify a configured bzout to display whatever information about all the stations' status is required.

The initial implementation uses one vertical bar of pizels for each other station's status and the remainder of the LEDs to the left for its own station status.

bzsrv has a simple web page and two main web service APIs:

`/`

`GET`: Returns simple web page with the badge states JSON as embedded text

`/api/badges`

`GET`: returns all the badges states

`POST`: applies all the badges states received, expects an array of badges of the form:

    [
        { badgeId : "<badge identifier>", statusName : "<badge status>" }
        , ...
    ]

`/api/input`

`POST`: takes an input object (like a control board with buttons) and event data - it then converts this to a badge state change in some fashion, like making button "A" from a UnicornHatMini set the badge status to "Busy"

Takes an input of the form:

    {
        input : {
                badgeid : "<badge identifier>"
                , device : "<device identifier>"
                , button : "<button identifier>"
        }
    }

The `/api/input` method is the point of expansion for any inputs that might need mapping or interpretation by bzsrv - for instance converting a given button or slider on a device to a state change.  Where the nature of a badge state change is already known, POST to `/api/badges` can be used - for instance from a calendaring connector.

## bzhub

Provides a central service version of bzsrv, without any discovery and with simple persistence from/to JSON file upon startup.  Use of such a service could be to bridge multiple networks or to provide a service that stays running when all devices are off.  It is not required for basic bz functionality.  Also a Node.js Express application

bzhub has a simple web page and one main web service API:

`/`

`GET`: Returns simple web page with the badge states JSON as embedded text

`/api/badges`

`GET`: returns all the badges states

`POST`: applies all the badges states received

## bzin

Provides input device handling for the 4-button UnicornHatMini.  This is a Python application which posts input messages to the bzsrv service.  Requires GPIO driver to identify button presses.  Does not expose any web API, it just sends messages to the designated bzsrv web APIs when buttons are pressed.  This component is optional - badge state can be set directly through bzsrv web API.

This component is most likely candidate for a plugin architecture or replacement by other input component as needed.
## bzout

Provides output device LED "screen" handling for the UnicornHatMini.  This is a Python application using the Flask framework.

bzout has a single web service API:

`/display`

`POST`: Accepts JSON `POST` data of an array of 24-bit RGB values of the form:

    { pixels : [ [r, g, b], ..., [r, g, b] ] }

where `0 <= r, g, b <= 255`

## bzcli

Command-line examples to manipulate and retrieve the busy status of the local badge from the local bzsrv service

    get-busystatus.js

    set-busystatus.js

## bzcmd

Powershell command-line examples

    Get-BzStatus.ps1

    Set-BzStatus.ps1
# Roadmap

Multiple external displays - i.e. multiple access doors or a light at desk facing the user and one outside the door

Desktop widget - effectively replacing a local user-facing light or display

Triggering from MS Teams (or other system) presence status

Scheduling busy/free lights based on a "Calender" or other scheduling application

Incorporate Bluetooth direct drive of relatively inexpensive single-color LED badge displays

Look again at converting UnicornHatMini driver code to Node.js

Look at converting node-discover code to Python for use in other embedded devices that support e.g. CircuitPython

Look at other lighter-weight WiFi devices like ESP that might require even simpler interfaces.