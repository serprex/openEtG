How to setup on Windows:

1	Install
	node.js 0.12.7 @ https://nodejs.org/dist/v0.12.7/
	redis @ https://github.com/MSOpenTech/redis/releases
	tortoisegit @ http://tortoisegit.org
	git @ http://git-scm.com/download/win
	ninja @ https://github.com/martine/ninja/releases

2	Right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/serprex/openEtG.git

3	Hold Shift and right-click on your openEtG folder that you created in step 2, click Open command window here, run "npm install;npm install -g mkcjs optipng-bin spritesheet-js"

4	Build pixi.js from https://github.com/serprex/pixi.js/tree/oetg or download from http://etg.dek.im/pixi.min.js

5a	ninja.exe should be in openEtG's folder. Run ninja.exe to build etgify.js

5b If ninja.exe isn't working, run buildOpenEtG.bat instead and download 
http://etg.dek.im/assets/atlas.js, http://etg.dek.im/assets/atlas.png and http://etg.dek.im/assets/atlas.css and add to the assets folder.

6	Start redis-server and, in console, run "node server.js"

7	Browse to http://127.0.0.1:13602 and it should work!

NB when you edit a module you need to run step 5 to update etgify