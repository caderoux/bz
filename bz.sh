#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DIR=$(echo $DIR | tr -d '\r')
echo "bz root: ${DIR}"

nohup $DIR/bzout/bzout.py &
nohup node $DIR/bzsrv/index.js &
nohup $DIR/bzin/bzin.py &
