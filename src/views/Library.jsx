import { useEffect, useMemo, useState } from 'react';

import Cards from '../Cards.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.jsx';

export default function Library(props) {
	const [data, setData] = useState({});
	const [card, setCard] = useState(null);
	const [showBound, setShowBound] = useState(false);

	useEffect(() => {
		store.store.dispatch(store.setCmds({ librarygive: setData }));
		sock.emit({ x: 'librarywant', f: props.name });
	}, [props.name]);

	const {
		progressmax,
		progress,
		shinyprogress,
		reprog,
		reprogmax,
		cardpool,
		boundpool,
	} = useMemo(() => {
		let progressmax = 0,
			progress = 0,
			shinyprogress = 0,
			reprog = [],
			reprogmax = [];
		const cardpool = etgutil.deck2pool(data.pool),
			boundpool = etgutil.deck2pool(data.bound),
			codeprog = code => {
				const upcode = etgutil.asUpped(code, true);
				return Math.min(
					(cardpool[code] ?? 0) +
						(boundpool[code] ?? 0) +
						((cardpool[upcode] ?? 0) + (boundpool[upcode] ?? 0)) * 6,
					42,
				);
			};
		Cards.Codes.forEach((card, code) => {
			if (!card.upped && !card.shiny && card.type && !card.getStatus('token')) {
				progressmax += 42;
				const prog = codeprog(code);
				const idx = card.rarity * 13 + card.element;
				reprog[idx] = (reprog[idx] ?? 0) + prog;
				reprogmax[idx] = (reprogmax[idx] ?? 0) + 42;
				progress += prog;
				shinyprogress += codeprog(etgutil.asShiny(code, true));
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
	}, [data.pool, data.bound]);
	const children = [];
	for (let e = 0; e < 13; e++) {
		children.push(
			<span
				className={`ico e${e}`}
				style={{
					position: 'absolute',
					left: `${36 + e * 53}px`,
					top: '54px',
				}}
			/>,
		);
	}
	for (let r = 1; r < 4; r++) {
		children.push(
			<span
				className={`ico r${r}`}
				style={{
					position: 'absolute',
					left: '8px',
					top: `${64 + r * 32}px`,
				}}
			/>,
		);
		for (let e = 0; e < 13; e++) {
			const idx = r * 13 + e;
			children.push(
				<span
					style={{
						position: 'absolute',
						left: `${36 + e * 53}px`,
						top: `${64 + r * 32}px`,
						fontSize: '12px',
						textShadow:
							reprog[idx] === reprogmax[idx] ? '1px 1px 2px #fff' : undefined,
					}}>
					{reprog[idx] ?? 0} / {reprogmax[idx] ?? 0}
				</span>,
			);
		}
	}
	return (
		<>
			<span
				style={{
					position: 'absolute',
					left: '100px',
					top: '8px',
					whiteSpace: 'pre',
				}}>
				{`Wealth ${
					data.gold + Math.round(userutil.calcWealth(Cards, cardpool))
				}\nGold ${data.gold}`}
			</span>
			<span
				style={{
					position: 'absolute',
					left: '320px',
					top: '8px',
					whiteSpace: 'pre',
				}}>
				ZE Progress {progress} / {progressmax}
				{'\nSZE Progress '}
				{shinyprogress} / {progressmax}
			</span>
			<span
				style={{
					position: 'absolute',
					left: '540px',
					top: '8px',
					whiteSpace: 'pre',
				}}>
				{`PvE ${data.aiwins} - ${data.ailosses}\nPvP ${data.pvpwins} - ${data.pvplosses}`}
			</span>
			<Components.Card x={734} y={8} card={card} />
			<input
				type="button"
				value="Toggle Bound"
				style={{
					position: 'absolute',
					left: '5px',
					top: '554px',
				}}
				onClick={() => {
					setShowBound(!showBound);
				}}
			/>
			<Components.ExitBtn x={5} y={8} />
			<input
				type="button"
				value="Export"
				style={{
					position: 'absolute',
					left: '5px',
					top: '28px',
				}}
				onClick={() => open('/collection/' + props.name, '_blank')}
			/>
			<Components.CardSelector
				cards={Cards}
				cardpool={showBound ? boundpool : cardpool}
				filterboth
				onMouseOver={c => {
					c !== card && setCard(c);
				}}
			/>
			{children}
		</>
	);
}