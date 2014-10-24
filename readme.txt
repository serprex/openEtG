How to setup on Windows:

1	Install
	node.js @ http://nodejs.org
	redis @ https://github.com/MSOpenTech/redis/tree/2.8/bin/release
	tortoisegit @ http://code.google.com/p/tortoisegit
	git @ http://git-scm.com/download/win

2	Right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/Fippe94/openEtG.git

3	Hold Shift and right-click on your openEtG folder that you created in step 2, click Open command window here, run "npm install"

4	Run "npm install -g browserify"

5	Run "node updatedb.js" (NB it takes csv files as parameters if you don't want to download every single one)

6	Download pixi.dev.js from https://github.com/GoodBoyDigital/pixi.js/tree/master/bin

7	Run "buildOpenEtg.bat" in your openEtG folder

8	Start redis-server, and in the console, run "node server.js"

9	Browse to http://127.0.0.1:13602 and it should work!

NB when you edit a module you need to run step 6 to update etgify, & when the card DB is updated you need to run step 5