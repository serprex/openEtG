copy /B etg.client.js+classes.js+ai.eval.js+ai.targeting.js+etg.js js.js /Y
browserify -r ./etgutil -r ./MersenneTwister -r ./Actives -r ./Effect -r ./Quest -o etgify.js