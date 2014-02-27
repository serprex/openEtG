copy /B etg.client.js+classes.js+actives.js+animations.js+ai.eval.js+ai.targeting.js+etg.js js.js /Y
browserify -r ./etgutil -r ./MersenneTwister -o etgify.js