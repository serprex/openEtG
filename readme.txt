How to setup on Windows:

1. 	install node.js @ http://nodejs.org
	install redis @ https://github.com/dmajkic/redis/downloads
	install tortoisegit @ http://code.google.com/p/tortoisegit
	install git for windows @ http://msysgit.github.io/
	(optional, but makes it easier to update the card db) install python3 @ http://www.python.org/download/releases/

2. 	right click where you want the files to be and click Git Clone to create an openetg folder somewhere, use the URL: https://github.com/Fippe94/openEtG.git

3.	If you didn't install Python 3: download every sheet from https://docs.google.com/spreadsheets/d/1dfKGdHqqLAAHdnw2mKBwaYwDIFODjQIjlg8ZPyRFVmA as csv files
	name the csv files to the name of the sheet minus DB (you name the creature sheet "creature", the shield sheet "shield", etc)
	If you did install Python 3: Run updatedb.py

4.	Hold Shift and right-click on your openEtG folder that you created in step 2, click Open command window here, type "npm install"

5. 	then run "npm install -g browserify"

6.      Run the "buildOpenEtg" file in your openEtG folder.

7.	start up the redis-server, and in the cmd window, type "node server.js"

8.	open http://127.0.0.1:13602 in your web browser and it should work!

Note that every time you have edited a file you need to run step 6 to update the game. Everytime the card DB is updated you need to run step 3 again. 
And every time you want to play the game you need to have node running