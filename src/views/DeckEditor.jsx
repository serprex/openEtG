import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import Cards from '../Cards.js';
import Editor from '../Components/Editor.jsx';
import * as Tutor from '../Components/Tutor.jsx';
import * as etgutil from '../etgutil.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import { chain } from '../util.js';

function processDeck(dcode) {
	let mark = 0,
		deck = etgutil.decodedeck(dcode);
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
	return { mark, deck };
}

function Qecks(props) {
	const [setting, setSetting] = useState(false);
	const user = useSelector(({ user }) => user);

	const buttons = [];
	for (let i = 0; i < 10; i++) {
		buttons.push(
			<input
				type="button"
				key={i}
				value={`${i + 1}`}
				className={`editbtn${
					user.selectedDeck === user.qecks[i] ? ' selectedbutton' : ''
				}`}
				onClick={() => {
					if (setting) {
						let swap = -1;
						for (let i = 0; i < 10; i++) {
							if (user.qecks[i] === user.selectedDeck) {
								swap = i;
							}
						}
						if (~swap) {
							sock.userExec('changeqeck', {
								number: swap,
								name: user.qecks[i],
							});
						}
						sock.userExec('changeqeck', {
							number: i,
							name: user.selectedDeck,
						});
						setSetting(false);
					} else if (props.onClick) {
						props.onClick(user.qecks[i]);
					}
				}}
			/>,
		);
	}
	return (
		<>
			<input
				type="button"
				value="Bind to #"
				className={setting ? 'selectedbutton' : undefined}
				onClick={() => setSetting(value => !value)}
				style={{
					position: 'absolute',
					left: '200px',
					top: '8px',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: '300px',
					top: '8px',
				}}>
				{buttons}
			</div>
		</>
	);
}

function DeckName({ i, name, deck, onClick }) {
	return (
		<div
			style={{
				position: 'absolute',
				left: `${4 + (i % 6) * 150}px`,
				top: `${32 + ((i / 6) | 0) * 21}px`,
				width: '142px',
				height: '21px',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
			}}>
			<a
				href={`deck/${deck}`}
				target="_blank"
				className={
					'ico ce' + etgutil.fromTrueMark(parseInt(deck.slice(-3), 32))
				}
			/>
			<span onClick={() => onClick(name)}>{name}</span>
		</div>
	);
}

function DeckNames({ user, name, onClick }) {
	const decks = useSelector(({ user }) => user.decks);
	let names = Object.keys(decks);
	try {
		const rx = name && new RegExp(name);
		if (rx) {
			names = names.filter(name => name.match(rx));
		}
	} catch {
		names = names.filter(name => ~name.indexOf(name));
	}
	return names
		.sort()
		.map((name, i) => (
			<DeckName
				key={name}
				deck={decks[name]}
				name={name}
				i={i}
				onClick={onClick}
			/>
		));
}

function DeckSelector(props) {
	const [name, setName] = useState('');
	const user = useSelector(({ user }) => user);

	return (
		<div
			className="bgbox"
			style={{
				position: 'absolute',
				top: '270px',
				width: '900px',
				height: '330px',
				overflowY: 'auto',
			}}>
			<input
				autoFocus
				placeholder="Name"
				value={name}
				onChange={e => setName(e.target.value)}
				onKeyPress={e => {
					if (e.which === 13 && (e.target.value || user.decks[''])) {
						props.loadDeck(e.target.value);
					}
				}}
				onClick={e => e.target.setSelectionRange(0, 999)}
				style={{ position: 'absolute', left: '4px', top: '4px' }}
			/>
			{name && (
				<>
					<input
						type="button"
						value="Create"
						style={{
							position: 'absolute',
							left: '158px',
							top: '4px',
						}}
						onClick={() => {
							props.saveDeck(user.selectedDeck);
							props.saveDeck(name, true);
							props.onClose();
						}}
					/>
					<input
						type="button"
						value="Rename"
						style={{ position: 'absolute', left: '258px', top: '4px' }}
						onClick={() => {
							sock.userExec('rmdeck', { name: user.selectedDeck });
							props.saveDeck(name, true);
							props.onClose();
						}}
					/>
				</>
			)}
			<input
				type="button"
				value="Exit"
				style={{
					position: 'absolute',
					left: '794px',
					top: '4px',
				}}
				onClick={props.onClose}
			/>
			<DeckNames name={name} onClick={props.loadDeck} />
		</div>
	);
}

export default function DeckEditor() {
	const user = useSelector(({ user }) => user);
	const pool = useMemo(() => {
		const pool = [];
		for (const [code, count] of chain(
			etgutil.iterraw(user.pool),
			etgutil.iterraw(user.accountbound),
		)) {
			if (Cards.Codes[code]) {
				pool[code] = (pool[code] ?? 0) + count;
			}
		}
		return pool;
	}, [user.pool, user.accountbound]);
	const deckRef = useRef();
	useEffect(() => {
		deckRef.current.setSelectionRange(0, 999);
	}, []);

	const [name, setName] = useState('');
	const [selected, setSelected] = useState(null);

	const [{ mark, deck }, setDeckData] = useState(() =>
		processDeck(user.decks[user.selectedDeck] ?? ''),
	);
	const cardMinus = useMemo(
		() => Cards.filterDeck(deck, pool, true),
		[pool, deck],
	);

	const [currentDeckCode, currentDeckCodeUnpolish] = useMemo(
		() => [
			etgutil.encodedeck(deck) + etgutil.toTrueMarkSuffix(mark),
			etgutil.encodedeck(deck.map(code => etgutil.asShiny(code, false))) +
				etgutil.toTrueMarkSuffix(mark),
		],
		[deck, mark],
	);

	const saveDeck = useCallback(
		(name, force) => {
			if (deck.length === 0) {
				sock.userExec('rmdeck', { name });
				return;
			}
			if (currentDeckCode !== user.decks[name]) {
				sock.userExec('setdeck', { d: currentDeckCode, name });
			} else if (force) sock.userExec('setdeck', { name });
		},
		[deck, currentDeckCode, user.decks],
	);

	const loadDeck = useCallback(
		name => {
			saveDeck(user.selectedDeck);
			sock.userExec('setdeck', { name });
			setDeckData(processDeck(sock.getDeck()));
		},
		[user.selectedDeck, saveDeck, setDeckData],
	);

	const onkeydown = useCallback(
		e => {
			if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')
				return;
			const kc = e.which,
				ch = e.key ?? String.fromCharCode(kc),
				chi = '1234567890'.indexOf(ch);
			if (~chi) {
				loadDeck(user.qecks[chi]);
			}
		},
		[user.qecks, loadDeck],
	);

	useEffect(() => {
		document.addEventListener('keydown', onkeydown);
		return () => document.removeEventListener('keydown', onkeydown);
	}, [onkeydown]);

	const [viewDecks, setViewDecks] = useState(false);
	const deckModeToggle = useCallback(
		() => setViewDecks(x => !x),
		[setViewDecks],
	);
	const deckModeOff = useCallback(() => setViewDecks(false), [setViewDecks]);

	return (
		<>
			<Editor
				cards={Cards}
				deck={deck}
				mark={mark}
				pool={pool}
				cardMinus={cardMinus}
				setDeck={deck => setDeckData({ deck: deck.sort(Cards.codeCmp), mark })}
				setMark={mark => setDeckData({ deck, mark })}
			/>
			<Tutor.Tutor x={4} y={220} panels={Tutor.Editor} />
			<label style={{ position: 'absolute', left: '536px', top: '238px' }}>
				Deck &nbsp;
				<input
					autoFocus
					value={currentDeckCodeUnpolish}
					onChange={e => {
						let dcode = e.target.value.trim();
						if (~dcode.indexOf(' ')) {
							const dsplit = dcode.split(' ').sort();
							dcode = '';
							let i = 0;
							while (i < dsplit.length) {
								const di = dsplit[i],
									i0 = i++;
								while (i < dsplit.length && dsplit[i] === di) {
									i++;
								}
								dcode += etgutil.encodeCount(i - i0);
								dcode += di;
							}
						}
						setDeckData(processDeck(dcode));
					}}
					ref={deckRef}
					onClick={e => {
						e.target.setSelectionRange(0, 999);
					}}
				/>
			</label>
			<div style={{ position: 'absolute', top: '8px', left: '8px' }}>
				{user.selectedDeck ?? ''}
			</div>
			<input
				type="button"
				value="Decks"
				onClick={deckModeToggle}
				style={{
					position: 'absolute',
					left: '8px',
					top: '58px',
				}}
			/>
			<input
				type="button"
				value="Revert"
				onClick={() => setDeckData(processDeck(sock.getDeck()))}
				style={{ position: 'absolute', left: '8px', top: '162px' }}
			/>
			<input
				type="button"
				value="Exit"
				onClick={() => {
					saveDeck(user.selectedDeck, true);
					store.store.dispatch(store.doNav(import('../views/MainMenu.jsx')));
				}}
				style={{ position: 'absolute', left: '8px', top: '110px' }}
			/>
			<Qecks onClick={loadDeck} />
			{viewDecks && (
				<DeckSelector
					loadDeck={loadDeck}
					saveDeck={saveDeck}
					onClose={deckModeOff}
				/>
			)}
		</>
	);
}