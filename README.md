[![Build](https://travis-ci.org/serprex/openEtG.svg?branch=master)](https://travis-ci.org/serprex/openEtG)

# openEtG

openEtG is an open source fork of the Flash ccg [Elements](http://elementsthegame.com).

## Developer Instructions

Copy `config-sample.json` to `config.json`

### Mac Installation

Open Terminal. All `commands` will be done in Terminal. You must have [XCode](https://developer.apple.com/xcode) installed.

1. Install [Homebrew](https://brew.sh)
1. Install required software: `brew install git node redis`
1. Clone the repository: `git clone https://github.com/serprex/openEtG && cd openEtG`
1. Install atlas files: `curl --compressed 'https://etg.dek.im/assets/{atlas.json,atlas.png,atlas.css}' -o 'assets/#1'`
1. Install npm modules and build project: `npm install && npm run dev`

#### Mac Start/Stop OpenEtG

1. Start redis server in the background: `redis-server &`
  * To stop the redis server run `pkill redis`, then press ctrl+c
1. Start node http server and open the game: `open http://127.0.0.1:8080 && npm start`
  * Since we open the page before the server has fully started, you may need to refresh the page
  * To stop the server, press ctrl+c in the Terminal

### Windows Installation

1. Download & Install the following:
  * [node.js](https://nodejs.org)
  * [redis](https://github.com/MSOpenTech/redis/releases)
  * [git](https://git-scm.com/download/win)
1. Clone the repository
1. Start redis-server
1. Install npm modules and global npm binaries:
  1. Shift+Right-Click on your repository folder
  1. Click `Open command window here`
  1. Run the command: `npm install; npm start`
  1. Leave this command window open for later
  1. Run `npm run dev`
  1. Download [atlas.json](https://etg.dek.im/assets/atlas.json), [atlas.png](https://etg.dek.im/assets/atlas.png) and [atlas.css](https://etg.dek.im/assets/atlas.css) and move them to the `assets` folder
1. Browse to [http://127.0.0.1:8080](http://127.0.0.1:8080) and the game should work!
