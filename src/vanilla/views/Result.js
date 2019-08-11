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
			const foedecks = game.data.players.filter(pd => !pd.user),
				foedeck = RngMock.choose(foedecks),
				foeDeck = etgutil
					.decodedeck(foedeck.deck)
					.map(code => game.Cards.Codes[code])
					.filter(card => card && !card.isFree());
			if (game.winner === this.state.player1.id) {
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
				let newpool = orig.pool;
				const cardswon = [];
				for (let i = 0; i < game.data.spins; i++) {
					const c0 = RngMock.choose(spins),
						c1 = RngMock.choose(spins),
						c2 = RngMock.choose(spins);
					if (c0 === c1 && c1 === c2) {
						cardswon.push(
							<Components.Card
								key={cardswon.length}
								x={200 + cardswon.length * 100}
								y={170}
								card={c0}
							/>,
						);
						newpool = etgutil.addcard(newpool, c0.code);
					}
				}
				const electrumwon = Math.floor(
					(game.data.basereward +
						game.data.hpreward * (this.state.player1.hp / 100)) *
						(this.state.player1.hp === this.state.player1.maxhp ? 2 : 1),
				);

				const update = {
					electrum: orig.electrum + game.data.cost + electrumwon,
				};
				if (orig.pool !== newpool) update.pool = newpool;
				userEmit('updateorig', update);
				this.props.dispatch(store.updateOrig(update));

				this.setState({ cardswon, electrumwon });
			}
		}

		render() {
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
