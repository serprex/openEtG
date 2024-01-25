import { createMemo, createSignal } from 'solid-js';

import * as sock from '../sock.jsx';
import { useRx, hasflag } from '../store.jsx';
import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import Card from '../Components/Card.jsx';
import CardSelector from '../Components/CardSelector.jsx';
import ExitBtn from '../Components/ExitBtn.jsx';
import Text from '../Components/Text.jsx';

export default function Upgrade() {
	const user = useRx(state => state.user);
	const cardpool = createMemo(() => etgutil.deck2pool(user.pool));
	const boundpool = createMemo(() => etgutil.deck2pool(user.accountbound));
	const [showBound, setShowBound] = createSignal(false);
	const [error, setError] = createSignal('');
	const [state, setState] = createSignal({
		card1: null,
		card2: null,
		canGrade: false,
		canLish: false,
		info1: '',
		info3: '',
		downgrade: false,
		downlish: false,
	});

	function upgradeCard(card) {
		if (!card.isFree()) {
			if (card.upped) return 'You cannot upgrade upgraded cards.';
			const use = ~card.rarity && !(card.rarity === 4 && card.shiny) ? 6 : 1;
			if (cardpool()[card.code] >= use || boundpool()[card.code] >= use) {
				sock.userExec('upgrade', { card: card.code });
			} else
				return `You need at least ${use} copies to be able to upgrade this card!`;
		} else if (user.gold >= 50) {
			sock.userExec('uppillar', { c: card.code });
		} else return 'You need 50$ to afford an upgraded pillar!';
	}
	function downgradeCard(card) {
		if (card.rarity || (card.shiny && card.upped)) {
			if (!card.upped) return 'You cannot downgrade downgraded cards.';
			sock.userExec('downgrade', { card: card.code });
		} else return 'You cannot downgrade pillars.';
	}
	function polishCard(card) {
		if (!card.isFree()) {
			if (card.shiny) return 'You cannot polish shiny cards.';
			if (card.rarity === 4) return 'You cannot polish Nymphs.';
			const use = card.rarity !== -1 ? 6 : 2;
			if (cardpool()[card.code] >= use || boundpool()[card.code] >= use) {
				sock.userExec('polish', { card: card.code });
			} else
				return `You need at least ${use} copies to be able to polish this card!`;
		} else if (user.gold >= 50) {
			sock.userExec('shpillar', { c: card.code });
		} else return 'You need 50$ to afford a shiny pillar!';
	}
	function unpolishCard(card) {
		if (card.rarity || (card.shiny && card.upped)) {
			if (!card.shiny) return 'You cannot unpolish non-shiny cards.';
			if (card.rarity === 4) return 'You cannot unpolish Nymphs.';
			sock.userExec('unpolish', { card: card.code });
		} else return 'You cannot unpolish pillars.';
	}
	function eventWrap(func) {
		return () => {
			const error =
				state().card1 ? func(state().card1) : 'Pick a card, any card.';
			if (error) setError(error);
		};
	}
	function autoCards() {
		sock.userExec('upshall');
	}
	return (
		<>
			<ExitBtn x={5} y={50} />
			{state().canGrade && (
				<input
					type="button"
					value={state().downgrade ? 'Downgrade' : 'Upgrade'}
					onClick={eventWrap(state().downgrade ? downgradeCard : upgradeCard)}
					style="position:absolute;left:150px;top:50px"
				/>
			)}
			{state().canLish && (
				<input
					type="button"
					value={state().downlish ? 'Unpolish' : 'Polish'}
					onClick={eventWrap(state().downlish ? unpolishCard : polishCard)}
					style="position:absolute;left:150px;top:95px"
				/>
			)}
			{!hasflag(user, 'no-up-merge') && (
				<input
					type="button"
					value="Autoconvert"
					onClick={autoCards}
					style="position:absolute;left:5px;top:138px"
				/>
			)}
			<div style="position:absolute;left:5px;top:240px">
				<Text text={user.gold + '$'} />
			</div>
			<div style="position:absolute;left:250px;top:50px">
				<Text text={state().info1} />
			</div>
			<div style="position:absolute;left:250px;top:95px">
				<Text text={state().info3} />
			</div>
			<div style="position:absolute;left:100px;top:170px">
				<Text text={error()} />
			</div>
			<Card x={534} y={8} card={state().card1} />
			<Card x={734} y={8} card={state().card2} />
			<input
				type="button"
				value="Toggle Bound"
				style="position:absolute;left:5px;top:554px"
				onClick={() => setShowBound(showBound => !showBound)}
			/>
			<CardSelector
				cards={Cards}
				cardpool={showBound() ? boundpool() : cardpool()}
				maxedIndicator
				filterboth
				onClick={card => {
					const newstate = {
						card1: card,
						card2: card.asUpped(true),
						canGrade: !hasflag(
							user,
							card.pillar ? 'no-up-pillar' : 'no-up-merge',
						),
						canLish: true,
					};
					if (card.upped) {
						newstate.info1 =
							card.isFree() ? ''
							: card.rarity !== -1 && !(card.rarity === 4 && card.shiny) ?
								'Convert into 6 downgraded copies.'
							:	'Convert into a downgraded version.';
						newstate.downgrade = true;
					} else {
						newstate.info1 =
							card.isFree() ? '50$ to upgrade'
							: card.rarity !== -1 && !(card.rarity === 4 || card.shiny) ?
								'Convert 6 into an upgraded version.'
							:	'Convert into an upgraded version.';
						newstate.downgrade = false;
					}
					if (card.rarity === 4) {
						newstate.info3 = `This card cannot be ${
							card.shiny ? 'un' : ''
						} polished.`;
						newstate.canLish = false;
					} else if (card.shiny) {
						newstate.info3 =
							card.isFree() ? ''
							: card.rarity !== -1 ? 'Convert into 6 non-shiny copies.'
							: 'Convert into 2 non-shiny copies.';
						newstate.downlish = true;
					} else {
						newstate.info3 =
							card.isFree() ? '50$ to polish'
							: card.rarity === 4 ? 'This card cannot be polished.'
							: card.rarity !== -1 ? 'Convert 6 into a shiny version.'
							: 'Convert 2 into a shiny version.';
						newstate.downlish = false;
					}
					setError('');
					setState(state => ({ ...state, ...newstate }));
				}}
			/>
		</>
	);
}
