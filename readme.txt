How Fippe setup on Windows:
1. 	install node.js @ http://nodejs.org
	install redis @ http://redis.io (Fippe didn't install redis, instead opting to lobotomize server.js. Your pick)
	install tortoisegit @ http://code.google.com/p/tortoisegit

2. 	right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/serprex/openEtG.git

3.	download every sheet from here: https://docs.google.com/spreadsheet/ccc?key=0AhacMqaIJo6ddG5rTXpxaHFOR20wVUZwMWZZRUlEWkE
	as an csv file and add them to the folder.
	name the cvs files to the name of the sheet minus DB (you name the creature sheet "creature", the shield sheet "shield" and so on)
	NB if Python is installed, updatedb.py will do this

4.	open cmd (probably have to do it as administrator) and navigate to the openetg folder, type "npm install"

5.	type "copy /b MersenneTwister.js+classes.js+actives.js+animations.js+etg.js js.js" Press y if it asks you to overwrite.
	NB if grunt is installed, one can merely grunt

6.	in the cmd window, type "node server.js"

7.	open http://127.0.0.1:13602 in your web browser and it should work!

Note that every time you have edited a file you need to run step 6 before playing the game again. And every time you want to play the game you need to run step 7 and 8 again

If this does not work, you need help, or you need to know how to send an update to serprex, contact serprex (or Fippe94 if you do not find serprex) in Elements chat @ http://elementscommunity.org/chat/blab.php