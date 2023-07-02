import * as etg from '../../etg.js';
import aiDecks from '../Decks.json' assert { type: 'json' };
import * as etgutil from '../../etgutil.js';
import Game from '../../Game.js';
import { choose, randint, randomcard, shuffle, upto } from '../../util.js';
import * as store from '../../store.jsx';
import * as Components from '../../Components/index.jsx';
import Cards from '../Cards.js';
import { userEmit, sendChallenge } from '../../sock.jsx';
import * as wasm from '../../rs/pkg/etg.js';

const ai4names = {
	[etg.Air]: ['Ari', 'es'],
	[etg.Aether]: ['Aeth', 'eric'],
	[etg.Darkness]: ['Shad', 'ow'],
	[etg.Death]: ['Mor', 'tis'],
	[etg.Earth]: ['Ter', 'ra'],
	[etg.Entropy]: ['Dis', 'cord'],
	[etg.Fire]: ['Pyr', 'ofuze'],
	[etg.Gravity]: ['Mas', 'sa'],
	[etg.Life]: ['Vit', 'al'],
	[etg.Light]: ['Lum', 'iel'],
	[etg.Time]: ['Chr', 'onos'],
	[etg.Water]: ['Aqua', 'rius'],
};

export function parseDeck(dcode) {
	dcode = dcode.trim();
	if (~dcode.indexOf(' ')) {
		const dsplit = dcode.split(' ').sort();
		dcode = '';
		let i = 0;
		while (i < dsplit.length) {
			const di = dsplit[i],
				dicode = parseInt(di, 32),
				i0 = i++;
			while (i < dsplit.length && dsplit[i] === di) {
				i++;
			}
			dcode += etgutil.encodeCount(i - i0);
			dcode += ~etgutil.fromTrueMark(dicode)
				? di
				: etgutil.encodeCode(dicode - 4000);
		}
	}
	return dcode;
}

function mkAi4() {
	const es = upto(144),
		e1 = ((es / 12) | 0) + 1,
		e2 = (es % 12) + 1,
		deck = wasm.deckgen_ai4(e1, e2);
	return [ai4names[e1][0] + ai4names[e2][1], etgutil.encodedeck(deck)];
}

export default function OriginalMainMenu() {
	const rx = store.useRx();
	const origfoename = () => rx.opts.origfoename ?? '';

	const vsAi = (level, cost, basereward, hpreward) => {
		if (
			hpreward > 0 &&
			!Cards.isDeckLegal(etgutil.decodedeck(rx.orig.deck), rx.orig)
		) {
			store.chatMsg(`Invalid deck`, 'System');
			return;
		}
		const [ainame, aideck] =
			level === 'custom'
				? ['Custom', parseDeck(origfoename())]
				: level === 'ai4'
				? mkAi4()
				: choose(aiDecks[level]);
		if (cost > 0) {
			const update = { electrum: -cost };
			userEmit('origadd', update);
			store.addOrig(update);
		}
		const game = new Game({
			seed: randint(),
			cardreward: '',
			set: 'Original',
			cost,
			basereward,
			hpreward,
			spins: level === 'custom' ? 0 : level === 'ai2' ? 2 : 3,
			rematch: () => vsAi(level, cost, basereward, hpreward),
			players: shuffle([
				{
					idx: 1,
					name: rx.user.name,
					user: rx.user.name,
					deck: rx.orig.deck,
				},
				{
					idx: 2,
					ai: 1,
					name: ainame,
					deck: aideck,
					hp: level === 'fg' ? 200 : level === 'ai4' ? 150 : 100,
					drawpower: level === 'ai4' || level === 'fg' ? 2 : 1,
					markpower: level === 'ai4' || level === 'fg' ? 3 : 1,
				},
			]),
		});
		store.doNav(import('../../views/Match.jsx'), { game });
	};

	return (
		<div style="position:absolute;width:900px;height:600px">
			<div style="display:flex;height:120px;justify-content:space-evenly;align-items:center">
				<input type="button" value="AI2" onClick={() => vsAi('ai2', 5, 5, 5)} />
				<input
					type="button"
					value="AI3"
					onClick={() => vsAi('ai3', 10, 10, 10)}
				/>
				<input
					type="button"
					value="AI4"
					onClick={() => vsAi('ai4', 20, 15, 25)}
				/>
				<input
					type="button"
					value="FG"
					onClick={() => vsAi('fg', 30, 30, 30)}
				/>
				<input
					type="button"
					value="Editor"
					onClick={() => store.doNav(import('./Editor.jsx'))}
				/>
				<input
					type="button"
					value="Bazaar"
					onClick={() => store.doNav(import('./Bazaar.jsx'))}
				/>
			</div>
			<input
				type="button"
				value="PvP"
				onClick={() => sendChallenge(origfoename(), true)}
				style="position:absolute;left:200px;top:140px"
			/>
			<input
				type="button"
				value="Sandbox PvP"
				onClick={() => sendChallenge(origfoename(), true, false)}
				style="position:absolute;left:200px;top:170px;width:96px"
			/>
			<input
				type="button"
				value="vs AI"
				onClick={() => vsAi('custom', 0, 0, 0)}
				style="position:absolute;left:200px;top:200px"
			/>
			<span style="position:absolute;left:300px;top:200px">
				Enter deck as Name to play against it
			</span>
			<input
				placeholder="Name"
				value={origfoename()}
				onInput={e => store.setOptTemp('origfoename', e.target.value)}
				style="position:absolute;left:300px;top:140px"
			/>
			<Components.ExitBtn x={9} y={140} />
			<Components.Text
				text={`${rx.orig.electrum}$`}
				style="font-size:14px;pointer-events:none;position:absolute;left:8px;top:160px"
			/>
		</div>
	);
}