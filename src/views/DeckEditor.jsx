import {
	createMemo,
	createSignal,
	createComputed,
	onCleanup,
	onMount,
} from 'solid-js';
import { Index } from 'solid-js/web';

import Cards from '../Cards.js';
import Editor from '../Components/Editor.jsx';
import * as Tutor from '../Components/Tutor.jsx';
import * as etgutil from '../etgutil.js';
import { userExec } from '../sock.jsx';
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
	const [setting, setSetting] = createSignal(false);

	const buttons = [];
	for (let i = 0; i < 10; i++) {
		buttons.push(
			<input
				type="button"
				value={`${i + 1}`}
				class={`editbtn${
					props.user.selectedDeck === props.user.qecks[i] ?
						' selectedbutton'
					:	''
				}`}
				onClick={() => {
					if (setting()) {
						let swap = -1;
						for (let i = 0; i < 10; i++) {
							if (props.user.qecks[i] === props.user.selectedDeck) {
								swap = i;
							}
						}
						if (~swap) {
							userExec('changeqeck', {
								number: swap,
								name: props.user.qecks[i],
							});
						}
						userExec('changeqeck', {
							number: i,
							name: props.user.selectedDeck,
						});
						setSetting(false);
					} else if (props.onClick) {
						props.onClick(props.user.qecks[i]);
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
				class={setting() ? 'selectedbutton' : undefined}
				onClick={() => setSetting(value => !value)}
				style="position:absolute;left:200px;top:8px"
			/>
			<div style="position:absolute;left:300px;top:8px">{buttons}</div>
		</>
	);
}

function DeckName(props) {
	return (
		<div
			style={{
				position: 'absolute',
				left: `${4 + (props.i % 6) * 150}px`,
				top: `${32 + ((props.i / 6) | 0) * 21}px`,
				width: '142px',
				height: '21px',
				overflow: 'hidden',
				'text-overflow': 'ellipsis',
				'white-space': 'nowrap',
			}}>
			<a
				href={`deck/${props.deck}`}
				target="_blank"
				class={
					'ico ce' + etgutil.fromTrueMark(parseInt(props.deck.slice(-3), 32))
				}
			/>
			<span onClick={() => props.onClick(props.name)}>{props.name}</span>
		</div>
	);
}

function DeckNames(props) {
	const names = () => {
		let names = Object.keys(props.user.decks);
		try {
			const rx = props.name && new RegExp(props.name);
			if (rx) {
				names = names.filter(name => name.match(rx));
			}
		} catch {
			names = names.filter(name => ~name.indexOf(name));
		}
		return names.sort();
	};
	return (
		<Index each={names()}>
			{(name, i) => (
				<DeckName
					deck={props.user.decks[name()]}
					name={name()}
					i={i}
					onClick={props.onClick}
				/>
			)}
		</Index>
	);
}

function DeckSelector(props) {
	let deckput;
	const [name, setName] = createSignal('');
	onMount(() => deckput.focus());

	return (
		<div
			class="bgbox"
			style="position:absolute;top:270px;width:900px;height:330px;overflow-y:auto">
			<input
				ref={deckput}
				autoFocus
				placeholder="Name"
				value={name()}
				onInput={e => setName(e.target.value)}
				onKeyDown={e => {
					if (e.key === 'Enter' && (e.target.value || props.user.decks[''])) {
						props.loadDeck(e.target.value);
					}
				}}
				onClick={e => e.target.setSelectionRange(0, 999)}
				style="position:absolute;left:4px;top:4px"
			/>
			{name() && (
				<>
					<input
						type="button"
						value="Create"
						style="position:absolute;left:158px;top:4px"
						onClick={() => {
							props.saveDeck(props.user.selectedDeck);
							props.saveDeck(name(), true);
							props.onClose();
						}}
					/>
					<input
						type="button"
						value="Rename"
						style="position:absolute;left:258px;top:4px"
						onClick={() => {
							const del = props.user.selectedDeck;
							props.saveDeck(name(), true);
							userExec('rmdeck', { name: del });
							props.onClose();
						}}
					/>
				</>
			)}
			<input
				type="button"
				value="Exit"
				style="position:absolute;left:794px;top:4px"
				onClick={props.onClose}
			/>
			<DeckNames user={props.user} name={name()} onClick={props.loadDeck} />
		</div>
	);
}

export default function DeckEditor() {
	const rx = store.useRx();
	const pool = createMemo(() => {
		const pool = [];
		for (const [code, count] of chain(
			etgutil.iterraw(rx.user.pool),
			etgutil.iterraw(rx.user.accountbound),
		)) {
			if (Cards.Codes[code]) {
				pool[code] = (pool[code] ?? 0) + count;
			}
		}
		return pool;
	});
	let deckref;
	onMount(() => deckref.setSelectionRange(0, 999));

	const [deckData, setDeckData] = createSignal(null);
	createComputed(() =>
		setDeckData(processDeck(rx.user.decks[rx.user.selectedDeck] ?? '')),
	);

	const autoup = () => !store.hasflag(rx.user, 'no-up-merge');
	const cardMinus = createMemo(() =>
		Cards.filterDeck(deckData().deck, pool(), true, autoup()),
	);

	const saveDeck = (name, force) => {
		if (deckData().deck.length === 0) {
			userExec('rmdeck', { name });
			return;
		}
		const currentDeckCode =
			etgutil.encodedeck(deckData().deck) +
			etgutil.toTrueMarkSuffix(deckData().mark);
		if (currentDeckCode !== rx.user.decks[name]) {
			userExec('setdeck', { d: currentDeckCode, name });
		} else if (force) userExec('setdeck', { name });
	};

	const loadDeck = name => {
		saveDeck(rx.user.selectedDeck);
		userExec('setdeck', { name });
		setDeckData(processDeck(store.getDeck()));
	};

	const onkeydown = e => {
		if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
		const chi = '1234567890'.indexOf(e.key);
		if (~chi) loadDeck(rx.user.qecks[chi]);
	};

	onMount(() => {
		document.addEventListener('keydown', onkeydown);
	});
	onCleanup(() => {
		document.removeEventListener('keydown', onkeydown);
	});

	const [viewDecks, setViewDecks] = createSignal(false);
	const deckModeToggle = () => setViewDecks(x => !x);
	const deckModeOff = () => setViewDecks(false);

	return (
		<>
			<Editor
				cards={Cards}
				deck={deckData().deck}
				mark={deckData().mark}
				pool={pool()}
				cardMinus={cardMinus()}
				autoup={autoup()}
				setDeck={deck =>
					setDeckData(data => ({ ...data, deck: deck.sort(Cards.codeCmp) }))
				}
				setMark={mark => setDeckData(data => ({ ...data, mark }))}
			/>
			<Tutor.Tutor x={4} y={220} panels={Tutor.Editor} />
			<label style="position:absolute;left:536px;top:238px">
				Deck &nbsp;
				<input
					autoFocus
					value={
						etgutil.encodedeck(
							deckData().deck.map(code => etgutil.asShiny(code, false)),
						) + etgutil.toTrueMarkSuffix(deckData().mark)
					}
					onInput={e => {
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
					ref={deckref}
					onClick={e => {
						e.target.setSelectionRange(0, 999);
					}}
				/>
			</label>
			<div style="position:absolute;top:8px;left:8px">
				{rx.user.selectedDeck ?? ''}
			</div>
			<input
				type="button"
				value="Decks"
				onClick={deckModeToggle}
				style="position:absolute;left:8px;top:58px"
			/>
			<input
				type="button"
				value="Revert"
				onClick={() => setDeckData(processDeck(store.getDeck()))}
				style="position:absolute;left:8px;top:162px"
			/>
			<input
				type="button"
				value="Exit"
				onClick={() => {
					saveDeck(rx.user.selectedDeck, true);
					store.doNav(import('../views/MainMenu.jsx'));
				}}
				style="position:absolute;left:8px;top:110px"
			/>
			<Qecks onClick={loadDeck} user={rx.user} />
			{viewDecks() && (
				<DeckSelector
					user={rx.user}
					loadDeck={loadDeck}
					saveDeck={saveDeck}
					onClose={deckModeOff}
				/>
			)}
		</>
	);
}
