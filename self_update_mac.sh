#!/bin/sh
# export bar=""
# for i in "$@"; do export bar="$bar '${i}'";done
osascript -e "do shell script \"./mac_updater.sh\" with administrator privileges"
