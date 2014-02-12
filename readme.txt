How Fippe setup on Windows:
1. 	install node.js @ http://nodejs.org
	install redis @ http://redis.io
	install tortoisegit @ http://code.google.com/p/tortoisegit

2. 	right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/serprex/openEtG.git

3.	download every sheet from https://docs.google.com/spreadsheet/ccc?key=0AhacMqaIJo6ddG5rTXpxaHFOR20wVUZwMWZZRUlEWkE as csv files
	name the csv files to the name of the sheet minus DB (you name the creature sheet "creature", the shield sheet "shield", etc)
	NB if Python is installed, updatedb.py will do this

4.	open cmd (probably have to do it as administrator) and navigate to the openetg folder, type "npm install"

5.	type "copy /B etg.client.js+ai.eval.js+ai.targeting.js+classes.js+actives.js+animations.js+etg.js js.js /Y"
	NB if grunt is installed, one can merely grunt

6. "npm install -g browserify" so that one can run "browserify -r ./etgutil -r ./MersenneTwister -o etgify.js"

7.	in the cmd window, type "node server.js"

8.	open http://127.0.0.1:13602 in your web browser and it should work!

Note that every time you have edited a file you need to run step 6 before playing the game again. And every time you want to play the game you need to run step 7 and 8 again

If this does not work, you need help, or you need to know how to send an update to serprex, contact serprex (or Fippe94 if you do not find serprex) in Elements chat @ http://elementscommunity.org/chat/blab.php