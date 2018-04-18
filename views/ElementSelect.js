'use strict';
const ui = require('../ui'),
	sock = require('../sock'),
	RngMock = require('../RngMock'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	descriptions = [
		'Element of randomness. Trade off consistency for cost effectiveness, make use of all elements, spawn mutants, & seek turn advantages into disadvantages.',
		'Element of decay. Gains advantages through destroying creatures and exhibiting control through poison.',
		'Element of order. Employs huge creatures that defend their owner, eat smaller creatures, and bypass shields.',
		'Element of defense. Its creatures may protect themselves and delay other creatures. Stoneskin allows increasing maxium HP.',
		'Element of healing. Likes having high HP and attacking with lots of small, cheap creatures. They may also multiply their creatures and make them attack multiple times.',
		'Element of destruction. Sacrifice defense for offense. Many of its spells damage creatures.',
		"Element of versatility. Water elementals like freezing opponent's creatures and mixing with other elements to grant them various powerful effects.",
		"Element of protection. Its creatures have high HP & it supports them with healing. Light's permanents allow it to be protected from spell damage, quanta drain, forced discard, and freezing.",
		'Element of efficiency. Its low cost creatures and permanents trade well with single target removal, while its own removal is area of effect.',
		"Element of speed. It speeds itself with card draw while delaying creatures & unsummoning them to their owner's deck.",
		"Element of trickery. Steals its opponent's resources such as HP, quanta, cards, & permanents. May deny their opponent from healing through reducing maxium health.",
		'Element of dimension. It copies creatures and generates cards. Many of their creatures are immaterial.',
		'Start without any cards, but gain several extra boosters instead!',
		'Start with a random element!',
	];

module.exports = class ElementSelect extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			eledesc: 'Select your starter element'
		};
	}

	componentDidMount() {
		store.store.dispatch(store.setCmds({
			login: data => {
				delete data.x;
				sock.user = data;
				store.store.dispatch(store.setOptTemp('selectedDeck', data.selectedDeck));
				store.store.dispatch(store.doNav(require('./MainMenu')));
			}
		}));
	}

	render() {
		const mainc = [];
		for (let i = 1; i <= 14; i++) {
			mainc.push(
				<Components.IconBtn
					key={i}
					e={'e' + (i < 13 ? i : i == 13 ? 14 : 13)}
					x={100 + Math.floor((i - 1) / 2) * 64}
					y={180 + ((i - 1) & 1) * 64}
					click={() => {
						const msg = {
							u: sock.user.name,
							a: sock.user.auth,
							e: i == 14 ? RngMock.upto(12) + 1 : i,
						};
						sock.user = undefined;
						sock.emit('inituser', msg);
					}}
					onMouseOver={() =>
						this.setState({ eledesc: ui.eleNames[i] + '\n\n' + descriptions[i - 1], })
					}
				/>,
			);
		}
		return <>
			<div
				style={{
					position: 'absolute',
					left: '100px',
					top: '300px',
					width: '700px',
					whiteSpace: 'pre-wrap',
				}}>
				{this.state.eledesc}
			</div>
			<Components.ExitBtn
				x={100}
				y={450}
				onClick={() => {
					sock.userEmit('delete');
					sock.user = undefined;
					store.store.dispatch(store.doNav(require('./Login')));
				}}
			/>
			{mainc}
		</>
	}
};
