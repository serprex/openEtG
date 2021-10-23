import { Component } from 'react';
import { connect } from 'react-redux';
import { Text } from './index.jsx';

export const Tutor = connect(({ opts }) => ({ enableTut: !opts.disableTut }))(
	class Tutor extends Component {
		constructor(props) {
			super(props);
			this.state = { showtut: null };
		}

		render() {
			return (
				this.props.enableTut && (
					<>
						<span
							className="imgb ico e13"
							onMouseEnter={() => {
								this.setState({ showtut: this.props.panels });
							}}
							onMouseLeave={() => {
								this.setState({ showtut: null });
							}}
							style={{
								position: 'absolute',
								left: this.props.x + 'px',
								top: this.props.y + 'px',
							}}
						/>
						{this.state.showtut}
					</>
				)
			);
		}
	},
);

function mkTutor(...data) {
	return (
		<div className="tutorialbg">
			{data.map(([style, text], i) => (
				<Text
					key={i}
					className="tutorialbox"
					text={text}
					style={{ position: 'absolute', ...style }}
				/>
			))}
		</div>
	);
}

export const Editor = mkTutor(
	[
		{ left: '100px', top: '48px', width: '624px' },
		'This is your deck. The Decks button opens the deck manager\nYou can also filter your decks with the /decks command in chat',
	],
	[
		{ left: '298px', top: '6px', width: '426px' },
		'Clicking a quickload slot loads the deck saved there',
	],
	[
		{ left: '100px', top: '232px', width: '418px' },
		'Choose a mark. You gain quanta for that element each turn',
	],
	[{ left: '520px', top: '236px' }, 'This is your deck code'],
	[
		{ left: '2px', top: '350px', width: '250px', height: '100px' },
		'Click these elements to show cards of that element\nThe rarity filters only show cards of that rarity, except pillar filter which shows all cards',
	],
	[
		{ left: '300px', top: '350px', width: '320px' },
		'Clicking a card adds it to your deck',
	],
	[
		{ left: '88px', top: '530px' },
		": Shows all cards, including those you don't own",
	],
	[{ left: '88px', top: '575px' }, ": Don't show shiny cards"],
);
export const Shop = mkTutor(
	[
		{ left: '45px', top: '97px', width: '520px', height: '158px' },
		'1) Select the element of the pack you want to buy\nEach card has a 50% chance of being in the chosen element\nRandom pack means the cards is completely random instead',
	],
	[
		{ left: '45px', top: '275px', width: '610px', height: '158px' },
		'2) Select the type of pack you want\nYou see the amount of cards & rarity of each pack in the upper box',
	],
	[
		{ left: '590px', top: '97px', width: '260px', height: '158px' },
		'3) Buy the pack you selected!\nIf you want to buy many packs at once, type in the Bulk box how many you want',
	],
);
