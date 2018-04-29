[![Build](https://travis-ci.org/serprex/openEtG.svg?branch=master)](https://travis-ci.org/serprex/openEtG)

# openEtG: An OpenWeb CCG

openEtG is an unofficial Open Web fork of the Flash game [Elements](http://elementsthegame.com).

## Developer Instructions

### Mac Installation

Open Terminal. All `commands` will be done in Terminal. You must have [XCode](https://developer.apple.com/xcode/) installed.

1. Install [Homebrew](http://brew.sh/)
1. Install required software: `brew install git node redis`
1. Clone the repository: `git clone https://github.com/serprex/openEtG.git && cd openEtG`
1. Install atlas files: `curl --compressed 'http://etg.dek.im/assets/{atlas.js,atlas.png,atlas.css}' -o 'assets/#1'`
1. Install npm modules and build project: `npm install && npm run build`

#### Mac Start/Stop OpenEtG

1. Start redis server in the background: `redis-server &`
  * To stop the redis server run `pkill redis`, then press ctrl+c
1. Start node http server and open the game: `open http://127.0.0.1:13602 && npm start`
  * Since we open the page before the server has fully started, you may need to refresh the page
  * To stop the server, press ctrl+c in the Terminal

### Windows Installation

1. Download and Install the following:
  * [node.js](https://nodejs.org)
  * [redis](https://github.com/MSOpenTech/redis/releases)
  * [git](http://git-scm.com/download/win)
  * [tortoisegit](https://tortoisegit.org)
1. Clone the repository:
  1. Right-click inside the folder where you want the game files to go
  1. Click `Git Clone` to create an `openEtG` folder
  1. When prompted, use this URL: `https://github.com/serprex/openEtG.git`
1. Install npm modules and global npm binaries:
  1. Shift+Right-Click on your `openEtG` folder
  1. Click `Open command window here`
  1. Run the command: `npm install; npm install -g spritesheet-js`
  1. Leave this command window open for later
  1. Run `npm run build`
  1. Download [atlas.js](http://etg.dek.im/assets/atlas.js), [atlas.png](http://etg.dek.im/assets/atlas.png) and [atlas.css](http://etg.dek.im/assets/atlas.css) and move them to the `assets` folder
1. Start redis-server
1. In the command window from previously, run the command: `npm start`
1. Browse to [http://127.0.0.1:13602](http://127.0.0.1:13602) and the game should work!

Note: When you edit code you need to `npm run build` to update the bundle.
