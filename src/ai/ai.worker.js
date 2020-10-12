import Effect from '../Effect.js';
Effect.disable = true;
import Game from '../Game.js';
import aiSearch from './search.js';

onmessage = function (e) {
	const {
		id,
		data: { data, moves },
	} = e.data;
	const game = new Game(data);
	for (const move of moves) {
		game.next(move);
	}
	postMessage({ id, cmd: aiSearch(game) });
};
