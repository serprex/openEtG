import { createMemo, createSignal } from 'solid-js';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import { chain } from '../util.js';
import Editor from '../Components/Editor.jsx';

const arpts = 380;
const artable = {
	hp: { min: 60, incr: 20, cost: 1 },
	mark: { cost: 20 },
	draw: { cost: 100 },
};
function AttrUi(p) {
	return (
		<div style="display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;text-align:right;width:98px">
			{['hp', 'mark', 'draw'].map(name => {
				const { min = 0, incr = 1 } = artable[name];
				return (
					<>
						{name}
						<input
							type="button"
							value="-"
							style={`width:12px;${
								p.attr[name] - incr >= min ? '' : 'visibility:hidden'
							}`}
							onClick={() =>
								p.setAttr(attr => ({ ...attr, [name]: attr[name] - incr }))
							}
						/>
						{p.attr[name]}
						<input
							type="button"
							value="+"
							style={`width:12px;${
								p.sumscore + incr * artable[name].cost <= p.arpts ?
									''
								:	'visibility:hidden'
							}`}
							onClick={() =>
								p.setAttr(attr => ({ ...attr, [name]: attr[name] + incr }))
							}
						/>
					</>
				);
			})}
			<div>{(p.arpts - p.sumscore) / 20}</div>
		</div>
	);
}

export default function ArenaEditor(props) {
	const rx = store.useRx();
	const pool = createMemo(() => {
		const baseacard = props.acard.asUpped(false).asShiny(false),
			pool = [];
		for (const [code, count] of chain(
			etgutil.iterraw(rx.user.pool),
			etgutil.iterraw(rx.user.accountbound),
		)) {
			const card = Cards.Codes[code];
			if (
				card &&
				card.asUpped(false).asShiny(false) !== baseacard &&
				(!card.upped || props.acard.upped)
			) {
				pool[code] = (pool[code] ?? 0) + count;
			}
		}
		pool[props.acard.code] = 5;
		return pool;
	});
	let amark = 0;
	const adeck = etgutil.decodedeck(props.adeck);
	for (let i = adeck.length - 1; i >= 0; i--) {
		if (!Cards.Codes[adeck[i]]) {
			const index = etgutil.fromTrueMark(adeck[i]);
			if (~index) {
				amark = index;
			}
			adeck.splice(i, 1);
		}
	}
	const [deck, setDeck] = createSignal(adeck);
	const [mark, setMark] = createSignal(amark);
	const autoup = () => !store.hasflag(rx.user, 'no-up-merge');
	const cardMinus = createMemo(() => {
		const cardMinus = Cards.filterDeck(deck(), pool(), false, autoup());
		cardMinus[props.acard.code] = 5;
		return cardMinus;
	});

	const [attr, setAttr] = createSignal({
		hp: props.ainfo.hp ?? 140,
		mark: props.ainfo.mark ?? 2,
		draw: props.ainfo.draw ?? 2,
	});

	const sumscore = () => {
		let sumscore = 0;
		for (const k in artable) {
			sumscore += attr()[k] * artable[k].cost;
		}
		return sumscore;
	};
	const acode = props.acard.code;
	return (
		<>
			<Editor
				cards={Cards}
				deck={[acode, acode, acode, acode, acode].concat(deck())}
				mark={mark()}
				pool={pool()}
				autoup={autoup()}
				cardMinus={cardMinus()}
				setDeck={deck => {
					setDeck(deck.filter(x => x !== acode).sort(Cards.codeCmp));
				}}
				setMark={setMark}
				noupped={!props.acard.upped}
			/>
			<div style="position:absolute;top:58px;height:160px;display:flex;flex-direction:column;justify-content:space-between">
				<input
					type="button"
					value="Save & Exit"
					style="margin-left:8px"
					onClick={() => {
						if (!Cards.isDeckLegal(deck(), rx.user) || sumscore() > arpts) {
							store.chatMsg(
								'Invalid deck, 35 cards required before submission',
								'System',
							);
							return;
						}
						const data = {
							d: etgutil.encodedeck(deck()) + etgutil.toTrueMarkSuffix(mark()),
							lv: +props.acard.upped,
							...attr(),
						};
						if (!props.acreate) {
							data.mod = true;
						}
						sock.userEmit('setarena', data);
						if (props.acreate && props.ainfo.day > 0) {
							store.updateUser({
								gold: rx.user.gold + Math.min(props.ainfo.day * 25, 350),
							});
						}
						store.chatMsg('Arena deck submitted', 'System');
						store.doNav(import('../views/MainMenu.jsx'));
					}}
				/>
				<input
					type="button"
					value="Exit"
					style="margin-left:8px"
					onClick={() => store.doNav(import('../views/ArenaInfo.jsx'))}
				/>
				<AttrUi
					attr={attr()}
					sumscore={sumscore()}
					arpts={arpts}
					setAttr={setAttr}
				/>
			</div>
		</>
	);
}
