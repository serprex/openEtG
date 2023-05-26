import { Component } from 'react';

import Cards from '../Cards.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.jsx';

export default class Library extends Component {
	constructor(props) {
		super(props);
		this.state = {
			card: null,
			showbound: false,
			pool: '',
			bound: '',
		};
	}

	componentDidMount() {
		store.store.dispatch(
			store.setCmds({
				librarygive: data => this.setState(data),
			}),
		);
		sock.emit({ x: 'librarywant', f: this.props.name });
	}

	render() {
		const cardpool = etgutil.deck2pool(this.state.pool),
			boundpool = etgutil.deck2pool(this.state.bound),
			codeprog = code => {
				const upcode = etgutil.asUpped(code, true);
				return Math.min(
					(cardpool[code] ?? 0) +
						(boundpool[code] ?? 0) +
						((cardpool[upcode] ?? 0) + (boundpool[upcode] ?? 0)) * 6,
					42,
				);
			};
		let progressmax = 0,
			progress = 0,
			shinyprogress = 0,
			reprog = [],
			reprogmax = [];
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
						this.state.gold + Math.round(userutil.calcWealth(Cards, cardpool))
					}\nGold ${this.state.gold}`}
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
					{`PvE ${this.state.aiwins} - ${this.state.ailosses}\nPvP ${this.state.pvpwins} - ${this.state.pvplosses}`}
				</span>
				<Components.Card x={734} y={8} card={this.state.card} />
				<input
					type="button"
					value="Toggle Bound"
					style={{
						position: 'absolute',
						left: '5px',
						top: '554px',
					}}
					onClick={() => {
						this.setState({ showbound: !this.state.showbound });
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
					onClick={() => open('/collection/' + this.props.name, '_blank')}
				/>
				<Components.CardSelector
					cards={Cards}
					cardpool={this.state.showbound ? boundpool : cardpool}
					filterboth
					onMouseOver={card => {
						card !== this.state.card && this.setState({ card });
					}}
				/>
				{children}
			</>
		);
	}
}