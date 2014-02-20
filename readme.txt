How Fippe setup on Windows:
1. 	install node.js @ http://nodejs.org
	install redis @ http://redis.io
	install tortoisegit @ http://code.google.com/p/tortoisegit

2. 	right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/Fippe94/openEtG.git

3.	download every sheet from https://docs.google.com/spreadsheets/d/1dfKGdHqqLAAHdnw2mKBwaYwDIFODjQIjlg8ZPyRFVmA as csv files
	name the csv files to the name of the sheet minus DB (you name the creature sheet "creature", the shield sheet "shield", etc)
	NB if Python3 is installed, updatedb.py will do this

4.	open cmd (probably have to do it as administrator) and navigate to the openetg folder, type "npm install"

5.	type "copy /B etg.client.js+classes.js+actives.js+animations.js+ai.eval.js+ai.targeting.js+etg.js js.js /Y"

6. "npm install -g browserify" so that one can run "browserify -r ./etgutil -r ./MersenneTwister -o etgify.js"

7.	in the cmd window, type "node server.js"

8.	open http://127.0.0.1:13602 in your web browser and it should work!

Note that every time you have edited a file you need to run step 5 or 6 to update the game. And every time you want to play the game you need to have node running