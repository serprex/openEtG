import { createMemo, createSignal, onMount } from 'solid-js';

import Cards from '../Cards.js';
import * as sock from '../sock.jsx';
import { doNav } from '../store.jsx';
import { deck2pool, asShiny, asUpped } from '../etgutil.js';
import { calcWealth } from '../userutil.js';
import Card from '../Components/Card.jsx';
import CardSelector from '../Components/CardSelector.jsx';

function loadAlt(user, alt) {
	sock.emit({ x: 'librarywant', f: user, a: alt });
}

export default function Library(props) {
	const [data, setData] = createSignal({});
	const [card, setCard] = createSignal(null);
	const [showBound, setShowBound] = createSignal(false);
	let altname;

	onMount(() => {
		sock.setCmds({ librarygive: setData });
		sock.emit({ x: 'librarywant', f: props.name, a: props.alt ?? '' });
	});

	const memo = createMemo(() => {
		let progressmax = 0,
			progress = 0,
			shinyprogress = 0,
			reprog = [],
			reprogmax = [];
		const cardpool = deck2pool(data().pool),
			boundpool = deck2pool(data().bound),
			codeprog = code => {
				const upcode = asUpped(code, true);
				return Math.min(
					(cardpool[code] ?? 0) +
						(boundpool[code] ?? 0) +
						((cardpool[upcode] ?? 0) + (boundpool[upcode] ?? 0)) * 6,
					42,
				);
			};
		Cards.Codes.forEach((card, code) => {
			if (
				!card.upped &&
				!card.shiny &&
				card.type &&
				!card.token &&
				~card.rarity
			) {
				progressmax += 42;
				const prog = codeprog(code);
				const idx = card.rarity * 13 + card.element;
				reprog[idx] = (reprog[idx] ?? 0) + prog;
				reprogmax[idx] = (reprogmax[idx] ?? 0) + 42;
				progress += prog;
				shinyprogress += codeprog(asShiny(code, true));
			}
		});
		return {
			progressmax,
			progress,
			shinyprogress,
			reprog,
			reprogmax,
			cardpool,
			boundpool,
		};
	});

	return (
		<>
			<div style="display:grid;column-gap:8px;grid-template-rows:auto auto;grid-template-columns:auto auto auto 1fr auto auto auto minmax(0,1fr) 1fr auto auto auto minmax(0,1fr);grid-auto-flow:column;width:730px">
				<input
					type="button"
					value="Exit"
					onClick={() => doNav(import('../views/MainMenu.jsx'))}
				/>
				<input
					type="button"
					value="Export"
					onClick={() =>
						open(
							`/collection/${encodeURIComponent(props.name)}${
								altname.value ? '?' + encodeURIComponent(altname.value) : ''
							}`,
							'_blank',
						)
					}
				/>
				<div style="text-align:right">Wealth</div>
				<div style="text-align:right">Gold</div>
				<div style="text-align:right">
					{data().gold + Math.round(calcWealth(Cards, memo().cardpool))}
				</div>
				<div style="text-align:right">{data().gold}</div>
				<div></div>
				<div></div>
				<div style="text-align:right">ZE Progress</div>
				<div style="text-align:right">SZE Progress</div>
				<div style="text-align:right">{memo().progress}</div>
				<div style="text-align:right">{memo().shinyprogress}</div>
				<div>/</div>
				<div>/</div>
				<div>{memo().progressmax}</div>
				<div>{memo().progressmax}</div>
				<div></div>
				<div></div>
				<div style="text-align:right">PvE</div>
				<div style="text-align:right">PvP</div>
				<div style="text-align:right">{data().aiwins}</div>
				<div style="text-align:right">{data().pvpwins}</div>
				<div>&ndash;</div>
				<div>&ndash;</div>
				<div>{data().ailosses}</div>
				<div>{data().pvpwins}</div>
			</div>
			<div style="margin-top:18px;row-gap:4px;display:grid;grid-template-rows:36px auto auto auto;grid-template-columns:24px repeat(13, 1fr);width:730px">
				<div></div>
				{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(e => (
					<span class={`ico e${e}`} />
				))}
				{[1, 2, 3, 4].map(r => (
					<>
						<span class={`ico r${r}`} />
						{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(e => {
							const idx = r * 13 + e;
							return (
								<span
									style={{
										'font-size': '11px',
										'text-shadow':
											memo().reprog[idx] === memo().reprogmax[idx] ?
												'1px 1px 2px #fff'
											:	undefined,
									}}>
									{memo().reprog[idx] ?? 0}/{memo().reprogmax[idx] ?? 0}
								</span>
							);
						})}
					</>
				))}
			</div>
			<Card x={734} y={8} card={card()} />
			<input
				type="button"
				value="Toggle Bound"
				style="position:absolute;left:5px;top:554px"
				onClick={() => setShowBound(showBound => !showBound)}
			/>
			<input
				value={props.alt ?? ''}
				style="position:absolute;left:5px;top:246px"
				placeholder="Alt"
				ref={altname}
				onKeyDown={e => {
					if (e.key === 'Enter') loadAlt(props.name, e.target.value);
				}}
			/>
			<input
				type="button"
				value="Load Alt"
				style="position:absolute;left:160px;top:246px"
				onClick={() => loadAlt(props.name, altname.value)}
			/>
			<CardSelector
				cards={Cards}
				cardpool={showBound() ? memo().boundpool : memo().cardpool}
				filterboth
				onMouseOver={setCard}
			/>
		</>
	);
}
