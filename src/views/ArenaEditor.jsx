import { Fragment, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import { chain } from '../util.js';
import Editor from '../Components/Editor.jsx';

const arpts = 400;
const artable = {
	hp: { min: 60, incr: 20, cost: 1 },
	mark: { cost: 20 },
	draw: { cost: 100 },
};
function AttrUi({ attr, sumscore, arpts, setAttr }) {
	return ['hp', 'mark', 'draw'].map((name, y) => {
		const top = `${128 + y * 20}px`;
		const { min = 0, incr = 1 } = artable[name];
		const value = attr[name];
		return (
			<Fragment key={y}>
				<div
					style={{
						position: 'absolute',
						left: '4px',
						top,
					}}>
					{name}
				</div>
				{value - incr >= min && (
					<input
						type="button"
						value="-"
						onClick={() => setAttr({ ...attr, [name]: value - incr })}
						style={{
							position: 'absolute',
							left: '38px',
							top,
							width: '14px',
						}}
					/>
				)}
				{sumscore + incr * artable[name].cost <= arpts && (
					<input
						type="button"
						value="+"
						onClick={() => setAttr({ ...attr, [name]: value + incr })}
						style={{
							position: 'absolute',
							left: '82px',
							top,
							width: '14px',
						}}
					/>
				)}
				<div
					style={{
						position: 'absolute',
						left: '56px',
						top,
					}}>
					{value}
				</div>
			</Fragment>
		);
	});
}

export default function ArenaEditor(props) {
	const user = useSelector(({ user }) => user);
	const pool = useMemo(() => {
		const baseacard = props.acard.asUpped(false).asShiny(false),
			pool = [];
		for (const [code, count] of chain(
			etgutil.iterraw(user.pool),
			etgutil.iterraw(user.accountbound),
		)) {
			if (
				Cards.Codes[code] &&
				(!props.acard ||
					(!Cards.Codes[code].isOf(baseacard) &&
						(props.acard.upped || !Cards.Codes[code].upped)))
			) {
				pool[code] = (pool[code] ?? 0) + count;
			}
		}
		pool[props.acard.code] = 5;
		return pool;
	}, [user.pool, user.accountbound, props.acard]);
	const [amark, adeck] = useMemo(() => {
		let mark = 0,
			adeck = etgutil.decodedeck(props.adeck);
		for (let i = adeck.length - 1; i >= 0; i--) {
			if (!Cards.Codes[adeck[i]]) {
				const index = etgutil.fromTrueMark(adeck[i]);
				if (~index) {
					mark = index;
				}
				adeck.splice(i, 1);
			}
		}
		return [mark, adeck];
	}, [props.adeck]);
	const [deck, setDeck] = useState(adeck);
	const [mark, setMark] = useState(amark);
	const cardMinus = useMemo(() => {
		const cardMinus = Cards.filterDeck(deck, pool);
		cardMinus[props.acard.code] = 5;
		return cardMinus;
	}, [deck, props.acard, pool]);

	const [attr, setAttr] = useState(() => ({
		hp: props.ainfo.hp ?? 160,
		mark: props.ainfo.mark ?? 2,
		draw: props.ainfo.draw ?? 2,
	}));

	let sumscore = 0;
	for (const k in artable) {
		sumscore += attr[k] * artable[k].cost;
	}
	const acode = props.acard.code;
	return (
		<>
			<Editor
				cards={Cards}
				deck={[acode, acode, acode, acode, acode].concat(deck)}
				mark={mark}
				pool={pool}
				cardMinus={cardMinus}
				setDeck={deck => {
					setDeck(deck.filter(x => x !== acode).sort(Cards.codeCmp));
				}}
				setMark={setMark}
				noupped={!props.acard.upped}
			/>
			<AttrUi attr={attr} sumscore={sumscore} arpts={arpts} setAttr={setAttr} />
			<div
				style={{
					position: 'absolute',
					left: '4px',
					top: '188px',
				}}>
				{(arpts - sumscore) / 20}
			</div>
			<input
				type="button"
				value="Save & Exit"
				onClick={() => {
					if (!Cards.isDeckLegal(deck, user) || sumscore > arpts) {
						store.store.dispatch(
							store.chatMsg(
								'Invalid deck, 35 cards required before submission',
								'System',
							),
						);
						return;
					}
					const data = {
						d: etgutil.encodedeck(deck) + etgutil.toTrueMarkSuffix(mark),
						lv: +props.acard.upped,
						hp: attr.hp,
						mark: attr.mark,
						draw: attr.draw,
					};
					if (!props.acreate) {
						data.mod = true;
					}
					sock.userEmit('setarena', data);
					if (props.acreate && props.ainfo.day > 0) {
						store.store.dispatch(
							store.updateUser({
								gold: user.gold + Math.min(props.ainfo.day * 25, 350),
							}),
						);
					}
					store.store.dispatch(store.chatMsg('Arena deck submitted', 'System'));
					store.store.dispatch(store.doNav(import('../views/MainMenu.jsx')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '58px',
				}}
			/>
			<input
				type="button"
				value="Exit"
				onClick={() => {
					store.store.dispatch(store.doNav(import('../views/ArenaInfo.jsx')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '84px',
				}}
			/>
		</>
	);
}