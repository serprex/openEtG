import { Component } from 'react';
import { connect } from 'react-redux';

import * as etg from '../../etg.js';
import aiDecks from '../Decks.json';
import * as etgutil from '../../etgutil.js';
import CreateGame from '../../Game.js';
import * as Rng from '../../Rng.js';
import * as store from '../../store.js';
import { randint } from '../../util.js';
import * as Components from '../../Components/index.js';
import Cards from '../Cards.js';
import { userEmit, sendChallenge } from '../../sock.js';

const ai4names = {
	[etg.Air]: ['Ari', 'es'],
	[etg.Aether]: ['Aeth', 'eric'],
	[etg.Darkness]: ['Shad', 'ow'],
	[etg.Death]: ['Mor', 'tis'],
	[etg.Earth]: ['Ter', 'ra'],
	[etg.Entropy]: ['Dis', 'cord'],
	[etg.Fire]: ['Pyr', 'ofuze'],
	[etg.Gravity]: ['Mas', 'sa'],
	[etg.Life]: ['Vit', 'al'],
	[etg.Light]: ['Lum', 'iel'],
	[etg.Time]: ['Chr', 'onos'],
	[etg.Water]: ['Aqua', 'rius'],
};

export function parseDeck(dcode) {
	dcode = dcode.trim();
	if (~dcode.indexOf(' ')) {
		const dsplit = dcode.split(' ').sort();
		dcode = '';
		let i = 0;
		while (i < dsplit.length) {
			const di = dsplit[i],
				dicode = parseInt(di, 32),
				i0 = i++;
			while (i < dsplit.length && dsplit[i] === di) {
				i++;
			}
			dcode += etgutil.encodeCount(i - i0);
			dcode += ~etgutil.fromTrueMark(dicode)
				? di
				: etgutil.encodeCode(dicode - 4000);
		}
	}
	return dcode;
}

export default connect(({ user, orig, opts }) => ({
	user,
	orig,
	origfoename: opts.origfoename ?? '',
}))(
	class OriginalMainMenu extends Component {
		state = { origname: '', origpass: '' };

		componentDidMount() {
			this.props.dispatch(
				store.setCmds({
					setorigpool: data => {
						this.props.dispatch(store.chatMsg('Imported', 'System'));
						this.props.dispatch(store.updateOrig({ pool: data.pool }));
					},
				}),
			);
		}

		mkAi4 = () => {
			const e1 = Rng.upto(12) + 1,
				e2 = Rng.upto(12) + 1,
				name = ai4names[e1][0] + ai4names[e2][1],
				deck = [];
			for (let i = 0; i < 24; i++) {
				const upped = Rng.rng() < 0.3;
				deck.push(etg.PillarList[i < 4 ? 0 : e1] - (upped ? 2000 : 4000));
			}
			for (let i = 0; i < 40; i++) {
				const e = i < 30 ? e1 : e2;
				const card = Rng.randomcard(
					Cards,
					Rng.rng() < 0.3,
					card =>
						card.element === e &&
						!card.isOf(Cards.Names.Miracle) &&
						card.rarity !== 15 &&
						card.rarity !== 20 &&
						!card.name.match('^Shard of ') &&
						!card.name.match('^Mark of '),
				);
				deck.push(card.code);
			}
			deck.push(etgutil.toTrueMark(e2));
			return [name, etgutil.encodedeck(deck)];
		};

		vsAi = (level, cost, basereward, hpreward) => {
			if (
				hpreward > 0 &&
				!Cards.isDeckLegal(
					etgutil.decodedeck(this.props.orig.deck),
					this.props.orig,
				)
			) {
				this.props.dispatch(store.chatMsg(`Invalid deck`, 'System'));
				return;
			}
			const [ainame, aideck] =
				level === 'custom'
					? ['Custom', parseDeck(this.props.origfoename)]
					: level === 'ai4'
					? this.mkAi4()
					: Rng.choose(aiDecks[level]);
			if (cost > 0) {
				const update = { electrum: -cost };
				userEmit('origadd', update);
				this.props.dispatch(store.addOrig(update));
			}
			CreateGame({
				seed: randint(),
				cardreward: '',
				set: 'Original',
				cost,
				basereward,
				hpreward,
				spins: level === 'custom' ? 0 : level === 'ai2' ? 2 : 3,
				rematch: () => this.vsAi(level, cost, basereward, hpreward),
				players: Rng.shuffle([
					{
						idx: 1,
						name: this.props.user.name,
						user: this.props.user.name,
						deck: this.props.orig.deck,
					},
					{
						idx: 2,
						ai: 1,
						name: ainame,
						deck: aideck,
						hp: level === 'fg' ? 200 : level === 'ai4' ? 150 : 100,
						drawpower: level === 'ai4' || level === 'fg' ? 2 : 1,
						markpower: level === 'ai4' || level === 'fg' ? 3 : 1,
					},
				]),
			}).then(game =>
				this.props.dispatch(
					store.doNav(import('../../views/Match.js'), { game }),
				),
			);
		};

		render() {
			return (
				<div
					style={{
						position: 'absolute',
						width: '900px',
						height: '600px',
					}}>
					<input
						type="button"
						value="AI2"
						onClick={() => this.vsAi('ai2', 5, 5, 5)}
					/>
					<input
						type="button"
						value="AI3"
						onClick={() => this.vsAi('ai3', 10, 10, 10)}
					/>
					<input
						type="button"
						value="AI4"
						onClick={() => this.vsAi('ai4', 20, 15, 25)}
					/>
					<input
						type="button"
						value="FG"
						onClick={() => this.vsAi('fg', 30, 30, 30)}
					/>
					<input
						type="button"
						value="Editor"
						onClick={() =>
							this.props.dispatch(store.doNav(import('./Editor.js')))
						}
					/>
					<input
						type="button"
						value="PvP"
						onClick={() => sendChallenge(this.props.origfoename, true)}
						style={{
							position: 'absolute',
							left: '200px',
							top: '140px',
						}}
					/>
					<input
						type="button"
						value="Sandbox PvP"
						onClick={() => sendChallenge(this.props.origfoename, true, false)}
						style={{
							position: 'absolute',
							left: '200px',
							top: '170px',
							width: '96px',
						}}
					/>
					<input
						type="button"
						value="vs AI"
						onClick={() => this.vsAi('custom', 0, 0, 0)}
						style={{
							position: 'absolute',
							left: '200px',
							top: '200px',
						}}
					/>
					<span
						style={{
							position: 'absolute',
							left: '300px',
							top: '200px',
						}}>
						Enter deck as Name to play against it
					</span>
					<input
						placeholder="Name"
						value={this.props.origfoename}
						onChange={e =>
							this.props.dispatch(
								store.setOptTemp('origfoename', e.target.value),
							)
						}
						style={{
							position: 'absolute',
							left: '300px',
							top: '140px',
						}}
					/>
					<input
						type="button"
						value="Upgrade"
						onClick={() =>
							this.props.dispatch(store.doNav(import('./Upgrade.js')))
						}
						style={{
							position: 'absolute',
							left: '500px',
							top: '140px',
						}}
					/>
					<input
						type="button"
						value="Bazaar"
						onClick={() =>
							this.props.dispatch(store.doNav(import('./Bazaar.js')))
						}
						style={{
							position: 'absolute',
							left: '500px',
							top: '170px',
						}}
					/>
					<input
						value={this.state.origname}
						placeholder="Original Username"
						onChange={e => this.setState({ origname: e.target.value })}
						style={{
							position: 'absolute',
							left: '700px',
							top: '110px',
						}}
					/>
					<input
						type="password"
						value={this.state.origpass}
						placeholder="Original Password"
						onChange={e => this.setState({ origpass: e.target.value })}
						style={{
							position: 'absolute',
							left: '700px',
							top: '140px',
						}}
					/>
					<input
						type="button"
						value="Import"
						onClick={() =>
							userEmit('origimport', {
								name: this.state.origname,
								pass: this.state.origpass,
							})
						}
						style={{
							position: 'absolute',
							left: '700px',
							top: '170px',
						}}
					/>
					<div style={{ position: 'absolute', left: '700px', top: '200px' }}>
						Only nymphs & marks
					</div>
					<Components.ExitBtn x={9} y={140} />
					<Components.Text
						text={`${this.props.orig.electrum}$`}
						style={{
							fontSize: '14px',
							pointerEvents: 'none',
							position: 'absolute',
							left: '8px',
							top: '160px',
						}}
					/>
				</div>
			);
		}
	},
);
