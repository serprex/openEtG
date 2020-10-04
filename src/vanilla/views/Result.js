import { Component } from 'react';
import { connect } from 'react-redux';

import { userEmit } from '../../sock.js';
import * as etg from '../../etg.js';
import * as etgutil from '../../etgutil.js';
import * as Components from '../../Components/index.js';
import * as store from '../../store.js';
import RngMock from '../../RngMock.js';

export default connect(({ user, orig }) => ({ user, orig }))(
	class OriginalResult extends Component {
		constructor(props) {
			super(props);
			this.state = {
				game: props.game,
				username: props.user && props.user.name,
				player1: props.game.byUser(props.user ? props.user.name : ''),
			};
		}

		static getDerivedStateFromProps(props, state) {
			if (
				props.game !== state.game ||
				(props.user && props.user.name) !== state.username
			) {
				const player1 = props.game.byUser(props.user ? props.user.name : '');
				return {
					game: props.game,
					username: props.user && props.user.name,
					player1,
				};
			}
			return null;
		}

		componentDidMount() {
			const { game, orig } = this.props;
			if (game.winner !== this.state.player1.id) return;
			const foedecks = game.data.players.filter(pd => !pd.user);
			if (foedecks.length === 0) return;
			const foedeck = RngMock.choose(foedecks),
				foeDeck = etgutil
					.decodedeck(foedeck.deck)
					.map(code => game.Cards.Codes[code])
					.filter(card => card && !card.isFree());
			let newpool = '';
			const cardswon = [];
			for (let i = 0; i < game.data.spins; i++) {
				const spins = [];
				while (spins.length < 4) {
					let card = RngMock.choose(foeDeck);
					if (
						!card ||
						card.rarity === 15 ||
						card.rarity === 20 ||
						card.name.startsWith('Mark of ')
					) {
						card = game.Cards.Names.Relic;
					}
					spins.push(card);
				}
				const c0 = RngMock.choose(spins),
					c1 = RngMock.choose(spins),
					c2 = RngMock.choose(spins);
				cardswon.push(
					<div
						key={cardswon.length}
						style={{ opacity: c0 === c1 && c1 === c2 ? undefined : '.3' }}>
						<Components.Card x={16 + i * 300} y={16} card={c0} />
						<Components.Card x={48 + i * 300} y={48} card={c1} />
						<Components.Card x={80 + i * 300} y={80} card={c2} />
					</div>,
				);
				if (c0 === c1 && c1 === c2) {
					newpool = etgutil.addcard(newpool, c0.code);
				}
			}
			const electrumwon = Math.floor(
				(game.data.basereward +
					game.data.hpreward * (this.state.player1.hp / 100)) *
					(this.state.player1.hp === this.state.player1.maxhp ? 2 : 1),
			);

			const update = {
				electrum: game.data.cost + electrumwon,
				pool: newpool || undefined,
			};
			userEmit('origadd', update);
			this.props.dispatch(store.addOrig(update.electrum, update.pool));

			this.setState({ cardswon, electrumwon });
		}

		render() {
			const { game } = this.props;
			return (
				<>
					<input
						type="button"
						value="Exit"
						style={{
							position: 'absolute',
							left: '412px',
							top: '440px',
						}}
						onClick={() => {
							store.store.dispatch(store.doNav(import('./MainMenu.js')));
						}}
					/>
					{game.data.rematch &&
						(!game.data.rematchFilter ||
							game.data.rematchFilter(this.props, this.state.player1.id)) && (
							<input
								type="button"
								value="Rematch"
								onClick={() => game.data.rematch(this.props)}
								style={{
									position: 'absolute',
									left: '412px',
									top: '490px',
								}}
							/>
						)}
					{this.state.cardswon}
					{this.state.electrumwon && (
						<Components.Text
							text={`${this.state.electrumwon}$`}
							style={{
								textAlign: 'center',
								width: '900px',
								position: 'absolute',
								left: '0px',
								top: '550px',
							}}
						/>
					)}
				</>
			);
		}
	},
);
