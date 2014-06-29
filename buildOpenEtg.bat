copy /B etg.client.js+classes.js+ai.eval.js+ai.targeting.js+etg.js+quests.js js.js /Y
browserify -r ./etgutil -r ./MersenneTwister -r ./Actives -r ./Effect -o etgify.js