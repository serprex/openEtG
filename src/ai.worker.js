import Game from './Game.js';

let game = null,
	premoves = null;
onmessage = function (e) {
	const {
		id,
		data: { data, moves },
	} = e.data;
	if (
		game === null ||
		premoves.length > moves.length ||
		JSON.stringify(data) !== JSON.stringify(game.data) ||
		JSON.stringify(premoves) !== JSON.stringify(moves.slice(0, premoves.length))
	) {
		game = new Game(data);
		premoves = null;
	}
	for (let i = premoves !== null ? premoves.length : 0; i < moves.length; i++) {
		game.next(moves[i], false);
	}
	premoves = moves;
	postMessage({ id, cmd: game.aiSearch() });
};
postMessage(null);
