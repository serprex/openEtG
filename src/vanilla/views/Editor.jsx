import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { parseDeck } from './MainMenu.jsx';
import * as etg from '../../etg.js';
import Cards from '../Cards.js';
import * as Components from '../../Components/index.jsx';
import Editor from '../../Components/Editor.jsx';
import * as etgutil from '../../etgutil.js';
import * as store from '../../store.jsx';
import * as util from '../../util.js';
import { userEmit } from '../../sock.jsx';

export default function OriginalEditor(props) {
	const orig = useSelector(({ orig }) => orig);
	const pool = useMemo(() => {
		const pool = [];
		for (const [code, count] of etgutil.iterraw(orig.pool)) {
			if (Cards.Codes[code]) {
				pool[code] = (pool[code] ?? 0) + count;
			}
		}
		return pool;
	}, [orig.pool]);
	const { mark, deck, cardMinus, deckCode } = useMemo(() => {
		let mark = 0,
			deck = etgutil.decodedeck(orig.deck);
		for (let i = deck.length - 1; i >= 0; i--) {
			if (!Cards.Codes[deck[i]]) {
				const index = etgutil.fromTrueMark(deck[i]);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}
		}
		deck.sort(Cards.codeCmp).splice(60);
		const cardMinus = Cards.filterDeck(deck, pool, true),
			deckCode = etgutil.encodedeck(deck) + etgutil.toTrueMarkSuffix(mark);

		return { mark, deck, cardMinus, deckCode };
	}, [orig.deck, pool]);

	const deckRef = useRef();
	useEffect(() => {
		deckRef.current.setSelectionRange(0, 999);
	}, []);

	return (
		<>
			<Editor
				cards={Cards}
				deck={deck}
				mark={mark}
				pool={pool}
				cardMinus={cardMinus}
				setDeck={deck => {
					store.store.dispatch(
						store.updateOrig({
							deck: etgutil.encodedeck(deck) + etgutil.toTrueMarkSuffix(mark),
						}),
					);
				}}
				setMark={mark => {
					store.store.dispatch(
						store.updateOrig({
							deck: deckCode.slice(0, -5) + etgutil.toTrueMarkSuffix(mark),
						}),
					);
				}}
			/>
			<input
				type="button"
				value="Exit"
				onClick={() => {
					const update = { deck: deckCode };
					userEmit('updateorig', update);
					store.store.dispatch(store.updateOrig(update));
					store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '110px',
				}}
			/>
			<label
				style={{
					position: 'absolute',
					left: '536px',
					top: '238px',
				}}>
				Deck&nbsp;
				<input
					autoFocus
					value={deckCode}
					onChange={e => {
						store.store.dispatch(
							store.updateOrig({ deck: parseDeck(e.target.value) }),
						);
					}}
					ref={deckRef}
					onClick={e => {
						e.target.setSelectionRange(0, 999);
					}}
				/>
			</label>
			<span
				className={'ico e' + mark}
				style={{
					position: 'absolute',
					left: '66px',
					top: '200px',
				}}
			/>
		</>
	);
}