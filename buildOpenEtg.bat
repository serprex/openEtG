copy /B etg.client.js+classes.js+animations.js+ai.eval.js+ai.targeting.js+etg.js+quests.js js.js /Y
browserify -r ./etgutil -r ./MersenneTwister -r ./Actives -o etgify.js