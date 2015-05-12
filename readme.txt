How to setup on Windows:

1	Install
	node.js @ http://nodejs.org
	redis @ https://github.com/MSOpenTech/redis/releases
	tortoisegit @ http://tortoisegit.org
	git @ http://git-scm.com/download/win
	ninja @ https://github.com/martine/ninja/releases

2	Right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/serprex/openEtG.git

3	Hold Shift and right-click on your openEtG folder that you created in step 2, click Open command window here, run "npm install;npm install -g mkcjs optipng-bin spritesheet-js"

4	Run "node updatedb.js" (NB it takes csv files as parameters if you don't want to download all of them)

5	Build pixi.js from https://github.com/serprex/pixi.js/tree/oetg or download from http://etg.dek.im/pixi.min.js

6	ninja.exe should be in openEtG's folder. Run ninja.exe to build etgify.js

7	Start redis-server and, in console, run "node server.js"

8	Browse to http://127.0.0.1:13602 and it should work!

NB when you edit a module you need to run step 6 to update etgify, & when the card DB is updated you need to run step 5