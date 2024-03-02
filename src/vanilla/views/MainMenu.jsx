import aiDecks from '../Decks.json' assert { type: 'json' };
import * as etgutil from '../../etgutil.js';
import Game from '../../Game.js';
import { choose, randint, shuffle, upto } from '../../util.js';
import * as store from '../../store.jsx';
import Card from '../../Components/Card.jsx';
import Cards from '../Cards.js';
import { userEmit, sendChallenge } from '../../sock.jsx';
import { deckgen_ai4, original_oracle } from '../../rs/pkg/etg.js';
import { deckgenAi4, aiNames } from '../../deckgen.js';

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
			dcode +=
				~etgutil.fromTrueMark(dicode) ? di : etgutil.encodeCode(dicode - 4000);
		}
	}
	return dcode;
}

function parseAiDeck(dcode) {
	dcode = dcode.trim();
	for (const level in aiDecks) {
		const aiDeck = aiDecks[level].find(x => x[0] === dcode);
		if (aiDeck) return { level, name: dcode, deck: aiDeck[1] };
	}
	for (let e1 = 1; e1 < 13; e1++)
		if (dcode.startsWith(aiNames[e1][0]))
			for (let e2 = 1; e2 < 13; e2++)
				if (dcode.endsWith(aiNames[e2][0]))
					return {
						level: 'ai4',
						name: aiNames[e1][0] + aiNames[e2][1],
						deck: etgutil.encodedeck(deckgen_ai4(e1, e2)),
					};
	return { level: 'custom', name: 'Custom', deck: parseDeck(dcode) };
}

export default function OriginalMainMenu() {
	const rx = store.useRx();
	const origfoename = () => rx.opts.origfoename ?? '';

	let ocard = null;
	const user_oracle = rx.alts[''].oracle;
	if (rx.user.oracle !== user_oracle) {
		const fg = upto(aiDecks.fg.length);
		const ocode = original_oracle(randint());
		ocard = Cards.Codes[ocode];
		const update = {
			pool: '01' + etgutil.encodeCode(ocode),
			oracle: user_oracle,
			fg,
		};
		userEmit('origadd', update);
		store.addOrig(update);
	}

	const vsAi = (level, cost, basereward, hpreward) => {
		if (
			hpreward > 0 &&
			!Cards.isDeckLegal(etgutil.decodedeck(rx.user.deck), rx.user)
		) {
			store.chatMsg('Invalid deck', 'System');
			return;
		}
		if (cost > 0) {
			const update = { electrum: -cost };
			userEmit('origadd', update);
			store.addOrig(update);
		}

		const aiinfo = level === 'custom' && parseAiDeck(origfoename());
		const ailevel = aiinfo ? aiinfo.level : level;
		const [ainame, aideck] =
			aiinfo ? [aiinfo.name, aiinfo.deck]
			: level === 'ai4' ? deckgenAi4()
			: level === 'fg' && typeof rx.user.fg === 'number' ?
				aiDecks.fg[rx.user.fg]
			:	choose(aiDecks[level]);
		if (level === 'fg' && typeof rx.user.fg === 'number') {
			userEmit('origadd', { fg: -1 });
			store.addOrig({ fg: -1 });
		}
		const game = new Game({
			seed: randint(),
			cardreward: '',
			set: 'Original',
			cost,
			basereward,
			hpreward,
			spins:
				level === 'custom' ? 0
				: level === 'ai2' ? 2
				: 3,
			rematch: () => vsAi(level, cost, basereward, hpreward),
			players: shuffle([
				{ idx: 1, name: rx.username, user: rx.username, deck: rx.user.deck },
				{
					idx: 2,
					ai: 1,
					name: ainame,
					deck: aideck,
					hp:
						ailevel === 'fg' ? 200
						: ailevel === 'ai4' ? 150
						: 100,
					drawpower: ailevel === 'ai4' || ailevel === 'fg' ? 2 : 1,
					markpower: ailevel === 'ai4' || ailevel === 'fg' ? 3 : 1,
				},
			]),
		});
		store.doNav(import('../../views/Match.jsx'), { game });
	};

	return (
		<>
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
					value={
						typeof rx.user.fg === 'number' ? aiDecks.fg[rx.user.fg][0] : 'FG'
					}
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
			<div style="display:flex;height:120px;justify-content:space-evenly">
				<div style="display:flex;flex-direction:column;justify-content:space-evenly">
					<input
						type="button"
						value="Exit"
						onClick={() => {
							store.stopLegacy();
							store.doNav(import('../../views/MainMenu.jsx'));
						}}
					/>
					<div>
						{rx.user.electrum}
						<span class="ico gold" />
					</div>
				</div>
				<div style="display:grid;grid-template-columns:auto auto;column-gap:4px;align-items:center">
					<input
						type="button"
						value="PvP"
						onClick={() => sendChallenge(origfoename(), true)}
					/>
					<input
						placeholder="Name"
						value={origfoename()}
						onInput={e => store.setOptTemp('origfoename', e.target.value)}
					/>
					<input
						type="button"
						value="Sandbox PvP"
						style="width:96px;grid-column:span 2"
						onClick={() => sendChallenge(origfoename(), true, false)}
					/>
					<input
						type="button"
						value="vs AI"
						onClick={() => vsAi('custom', 0, 0, 0)}
					/>
					<span>Enter deck as Name to play against it</span>
				</div>
				<input
					type="button"
					value="Electrum T99"
					style="width:auto"
					onClick={() => store.doNav(import('./Wealth.jsx'))}
				/>
			</div>
			<Card card={ocard} />
		</>
	);
}
