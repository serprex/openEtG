import React from 'react';
import { connect } from 'react-redux';
import { Text } from './index.js';

const connector = connect(({ opts }) => ({ disableTut: opts.disableTut }));
const mkTutor = function(data) {
	const splash = (
		<div className="tutorialbg">
			{data.map((info, i) => {
				const style = {
					position: 'absolute',
					left: info[0] + 'px',
					top: info[1] + 'px',
				};
				if (info.length > 2) style.width = info[2] + 'px';
				if (info.length > 3) style.height = info[3] + 'px';
				return (
					<Text
						key={i}
						className="tutorialbox"
						text={info[info.length - 1]}
						style={style}
					/>
				);
			})}
		</div>
	);
	return connector(
		class Tutor extends React.Component {
			constructor(props) {
				super(props);
				this.state = { showtut: false };
			}

			render() {
				if (this.props.disableTut) return null;
				return (
					<>
						<span
							className="imgb ico e13"
							onMouseEnter={() => {
								this.setState({ showtut: true });
							}}
							onMouseLeave={() => {
								this.setState({ showtut: false });
							}}
							style={{
								position: 'absolute',
								left: this.props.x + 'px',
								top: this.props.y + 'px',
							}}
						/>
						{this.state.showtut && splash}
					</>
				);
			}
		},
	);
};

export const Editor = mkTutor([
	[
		100,
		48,
		624,
		'This is your deck. The Decks button opens the deck manager' +
			'\nYou can also filter your decks with the /decks command in chat',
	],
	[298, 6, 426, 'Clicking a quickload slot loads the deck saved there'],
	[100, 232, 418, 'Choose a mark. You gain quanta for that element each turn'],
	[520, 236, 'This is your deck code'],
	[
		2,
		350,
		250,
		100,
		'Click these elements to show cards of that element\nThe rarity filters only show cards of that rarity, except pillar filter which shows all cards',
	],
	[300, 350, 320, 'Clicking a card adds it to your deck'],
	[88, 530, ": Shows all cards, including those you don't own"],
	[88, 575, ": Don't show shiny cards"],
]);
export const Shop = mkTutor([
	[
		45,
		97,
		520,
		158,
		'1) Select the element of the pack you want to buy\nEach card has a 50% chance of being in the chosen element\nRandom pack means the cards is completely random instead',
	],
	[
		45,
		275,
		610,
		158,
		'2) Select the type of pack you want\nYou see the amount of cards & rarity of each pack in the upper box',
	],
	[
		590,
		97,
		260,
		158,
		'3) Buy the pack you selected!\nIf you want to buy many packs at once, type in the Bulk box how many you want',
	],
]);
