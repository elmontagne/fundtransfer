#!/bin/bash
cd "`dirname "$0"`"
[ ! -d "node_modules" ] && echo "Downloading dependencies. Please wait..." && npm install --silent
npm run start
read -p ""