How to setup on Windows:
1. 	install node.js
	install tortoisegit

2. 	right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/serprex/openEtG.git

3.	download every sheet from here: https://docs.google.com/spreadsheet/ccc?key=0AhacMqaIJo6ddG5rTXpxaHFOR20wVUZwMWZZRUlEWkE
	as an csv file and add them to the folder.
	name the cvs files to the name of the sheet minus DB (you name the creature sheet "creature", the shield sheet "shield" and so on)
	NB if Python is installed, updatedb.py will do this

4.	open cmd (probably have to do it as administrator) and navigate to the openetg folder, type "npm install"

5.	copy server.js to server2.js and replace "gzip.staticGzip" with "connect.static", and remove the line starting with "var gzip = " (lines are seperated with ';')
	NB On non Windows machines gzip is installed and this won't be necessary

6.	type "copy /b MersenneTwister.js+classes.js+actives.js+animations.js+etg.js+pixi.js js.js" Press y if it asks you to overwrite.
	NB if grunt is installed, one can merely grunt

7.	in the cmd window, type "node server2.js"

8.	open http://127.0.0.1:13602 in your web browser and it should work!

Note that every time you have edited a file you need to run step 6 before playing the game again. And every time you want to play the game you need to run step 7 and 8 again.

If this does not work, you need help or you need to know how to send the update to serprex, contact serprex (or Fippe94 if you do not find serprex) in chat or otherwise.