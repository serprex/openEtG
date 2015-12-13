#!/bin/sh
egrep --color=always -nr --include \*.js --exclude-dir="\.git" --exclude-dir=node_modules --exclude-dir=Cards --exclude="pixi*\.js" --exclude="*\.min\.js" --exclude="*ify\.js" --exclude-dir=vanilla --exclude-dir=cia "$@" .|expand -t1
