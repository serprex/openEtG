cat etg.client.js classes.js actives.js animations.js ai.eval.js ai.targeting.js etg.js > js.js
browserify -r ./etgutil -r ./MersenneTwister -o etgify.js