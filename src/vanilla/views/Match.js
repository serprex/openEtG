import React from 'react';
import { connect } from 'react-redux';

import * as ui from '../ui.js';
import * as etg from '../etg.js';
import * as sock from '../sock.js';
import Card from '../Card.js';
import * as Cards from '../Cards.js';
import Effect from '../Effect.js';
import aiSearch from '../ai/search.js';
import * as Components from '../Components.js';
import * as store from '../store.js';

const svgbg = (() => {
	const redhor = new Uint16Array([
			12,
			0,
			900,
			144,
			145,
			796,
			301,
			103,
			796,
			459,
			103,
			754,
		]),
		redver = new Uint16Array([
			103,
			301,
			600,
			144,
			12,
			301,
			275,
			12,
			144,
			624,
			459,
			600,
			754,
			301,
			600,
			796,
			12,
			301,
		]);
	const redren = [];
	for (let j = 0; j < 3; j++) {
		let path = '';
		for (let i = 0; i < redhor.length; i += 3) {
			path +=
				'M' +
				redhor[i + 1] +
				' ' +
				(redhor[i] - j) +
				'L' +
				redhor[i + 2] +
				' ' +
				(redhor[i] - j);
		}
		for (let i = 0; i < redver.length; i += 3) {
			path +=
				'M' +
				(redver[i] + j) +
				' ' +
				redver[i + 1] +
				'L' +
				(redver[i] + j) +
				' ' +
				redver[i + 2];
		}
		redren.push(
			<path
				key={j}
				d={path}
				stroke={['#111', '#6a2e0d', '#8a3e1d'][j]}
				strokeWidth="3"
			/>,
		);
	}
	return (
		<svg
			width="900"
			height="600"
			style={{
				position: 'absolute',
				left: '0',
				top: '0',
				zIndex: '-8',
				pointerEvents: 'none',
			}}>
			{redren}
		</svg>
	);
})();

const floodsvg = (
	<svg
		width="900"
		height="600"
		style={{
			position: 'absolute',
			left: '0',
			top: '0',
			zIndex: '1',
			pointerEvents: 'none',
		}}>
		<path
			d="M149 146l644 0l0 64l-400 0l0 64l-244 0zM107 454l644 0l0-128l-244 0l0 64l-400 0z"
			fill="#0486"
		/>
	</svg>
);

const cloaksvg = (
	<div
		style={{
			position: 'absolute',
			left: '130px',
			top: '20px',
			width: '660px',
			height: '280px',
			backgroundColor: '#000',
			zIndex: '1',
			pointerEvents: 'none',
		}}
	/>
);

const activeInfo = {
	firebolt(t, game) {
		return 3 + Math.floor(game.player1.quanta[etg.Fire] / 4);
	},
	drainlife(t, game) {
		return 2 + Math.floor(game.player1.quanta[etg.Darkness] / 5);
	},
	icebolt(t, game) {
		const bolts = Math.floor(game.player1.quanta[etg.Water] / 5);
		return `${2 + bolts} ${35 + bolts * 5}%`;
	},
	catapult(t, game) {
		return Math.ceil(
			(t.truehp() * (t.status.get('frozen') ? 150 : 100)) / (t.truehp() + 100),
		);
	},
	adrenaline(t, game) {
		return 'Extra: ' + etg.getAdrenalRow(t.trueatk());
	},
};

function ThingInst(props) {
	const { obj, game } = props,
		scale =
			obj.type === etg.Weapon || obj.type === etg.Shield
				? 1.2
				: obj.type == etg.Spell
				? 0.85
				: 1,
		isSpell = obj.type === etg.Spell,
		pos = ui.tgtToPos(obj);
	if (isSpell && obj.owner == game.player2 && !game.player1.precognition) {
		return (
			<div
				style={{
					position: 'absolute',
					left: pos.x - 32 + 'px',
					top: pos.y - 38 + 'px',
					width: '68px',
					height: '80px',
					border: 'transparent 2px solid',
				}}
				className={tgtclass(game, obj)}
				onMouseOut={props.onMouseOut}
				onClick={() => props.onClick(obj)}>
				<div
					className="ico cback"
					style={{
						left: '2px',
						top: '2px',
					}}
				/>
			</div>
		);
	}
	const children = [];
	const visible = [
		obj.getStatus('psionic'),
		obj.getStatus('aflatoxin'),
		!obj.getStatus('aflatoxin') && obj.getStatus('poison') > 0,
		obj.getStatus('airborne') || obj.getStatus('ranged'),
		obj.getStatus('momentum'),
		obj.getStatus('adrenaline'),
		obj.getStatus('poison') < 0,
	];
	const bordervisible = [
		obj.getStatus('delayed'),
		obj == obj.owner.gpull,
		obj.getStatus('frozen'),
	];
	for (let k = 0; k < 7; k++) {
		if (!isSpell && visible[k]) {
			children.push(
				<div
					className={'ico s' + k}
					key={k}
					style={{
						position: 'absolute',
						top: 64 * scale + 10 + 'px',
						left: [32, 8, 8, 0, 24, 16, 8][k] + 'px',
						opacity: '.6',
					}}
				/>,
			);
		}
	}
	for (let k = 0; k < 3; k++) {
		if (!isSpell && bordervisible[k]) {
			children.push(
				<div
					className={'ico sborder' + k}
					key={7 + k}
					style={{
						position: 'absolute',
						left: '0',
						top: '0',
						transform: scale === 1 ? undefined : 'scale(' + scale + ')',
					}}
				/>,
			);
		}
	}
	let statText, topText;
	if (!isSpell) {
		const charges = obj.getStatus('charges');
		topText = obj.activetext();
		if (obj.type === etg.Creature) {
			statText = `${obj.trueatk()} | ${obj.truehp()}${
				charges ? ' x' + charges : ''
			}`;
		} else if (obj.type === etg.Permanent) {
			if (obj.card.type === etg.Pillar) {
				statText = `1:${
					obj.getStatus('pendstate') ? obj.owner.mark : obj.card.element
				} x${charges}`;
				topText = '';
			} else {
				statText = (charges || '').toString();
			}
		} else if (obj.type === etg.Weapon) {
			statText = `${obj.trueatk()}${charges ? ' x' + charges : ''}`;
		} else if (obj.type === etg.Shield) {
			statText = charges ? 'x' + charges : obj.dr.toString();
		}
	} else {
		statText = `${obj.card.cost}:${obj.card.costele}`;
	}
	return (
		<div
			style={{
				position: 'absolute',
				left: pos.x - 32 * scale + 'px',
				top: pos.y - 36 * scale + 'px',
				width: 64 * scale + 4 + 'px',
				height: (isSpell ? 64 : 72) * scale + 4 + 'px',
				opacity: obj.isMaterial() ? '1' : '.7',
				color: obj.card.upped ? '#000' : '#fff',
				fontSize: '10px',
				border: 'transparent 2px solid',
				zIndex: !isSpell && obj.getStatus('cloak') ? '2' : undefined,
			}}
			onMouseOver={props.setInfo && (e => props.setInfo(e, obj, pos.x))}
			className={tgtclass(game, obj)}
			onMouseOut={props.onMouseOut}
			onClick={() => props.onClick(obj)}>
			<img
				key={0}
				className={obj.card.shiny ? 'shiny' : undefined}
				src={'../Cards/' + obj.card.code.toString(32) + '.png'}
				style={{
					position: 'absolute',
					left: '0',
					top: isSpell ? '0' : '10px',
					width: 64 * scale + 'px',
					height: 64 * scale + 'px',
					backgroundColor: ui.maybeLightenStr(obj.card),
					pointerEvents: 'none',
				}}
			/>
			{children}
			{topText && (
				<Components.Text
					text={topText}
					icoprefix="te"
					style={{
						position: 'absolute',
						left: '0',
						top: '-8px',
						width: 64 * scale + 'px',
						overflow: 'hidden',
						backgroundColor: ui.maybeLightenStr(obj.card),
					}}
				/>
			)}
			{statText && (
				<Components.Text
					text={statText}
					icoprefix="te"
					style={{
						fontSize: '12px',
						position: 'absolute',
						top: isSpell ? '0' : '10px',
						right: '0',
						paddingLeft: '2px',
						backgroundColor: ui.maybeLightenStr(obj.card),
					}}
				/>
			)}
		</div>
	);
}

function tgtclass(game, obj) {
	if (game.targeting) {
		if (game.targeting.filter(obj)) return 'ants-red';
	} else if (obj.owner === game.player1 && obj.canactive()) return 'canactive';
}

export default connect()(
	class Match extends React.Component {
		constructor(props) {
			super(props);
			this.aiState = null;
			this.aiCommand = false;
			this.aiDelay = 0;
			this.state = {
				tooltip: '',
				foeplays: [],
				discarding: false,
				resigning: false,
				effects: null,
			};
		}

		endClick(discard) {
			const { game } = this.props;
			if (game.winner) {
				this.props.dispatch(store.doNav(import('./Result'), { game }));
			} else if (game.turn == game.player1) {
				if (discard == undefined && game.player1.hand.length == 8) {
					this.setState({ discarding: true });
				} else {
					if (!game.ai) sock.emit('end', { bits: discard });
					game.player1.endturn(discard);
					game.targeting = null;
					this.setState({ discarding: false, foeplays: [] });
				}
			}
		}

		cancelClick() {
			const { game } = this.props;
			if (this.state.resigning) {
				this.setState({ resigning: false });
			} else if (game.turn == game.player1) {
				if (game.targeting) {
					game.targeting = null;
					this.forceUpdate();
				} else this.setState({ discarding: false });
			}
		}

		resignClick() {
			const { game } = this.props;
			if (this.state.resigning) {
				if (!game.ai) sock.emit('resign');
				game.setWinner(game.player2);
				this.endClick();
			} else {
				this.setState({ resigning: true });
			}
		}

		playerClick(j) {
			const { game } = this.props;
			if (
				game.phase == etg.PlayPhase &&
				game.targeting &&
				game.targeting.filter(game.players(j))
			) {
				game.targeting.cb(game.players(j));
				this.forceUpdate();
			}
		}

		thingClick(obj) {
			const { game } = this.props;
			this.clearCard();
			if (game.phase != etg.PlayPhase) return;
			if (obj.owner == game.player1 && this.state.discarding) {
				if (obj.type == etg.Spell) this.endClick(obj.getIndex());
			} else if (game.targeting) {
				if (game.targeting.filter(obj)) {
					game.targeting.cb(obj);
					this.forceUpdate();
				}
			} else if (obj.owner == game.player1 && obj.canactive()) {
				const cb = tgt => {
					if (!game.ai) {
						sock.emit('cast', {
							bits: game.tgtToBits(obj) | (game.tgtToBits(tgt) << 9),
						});
					}
					obj.useactive(tgt);
					this.forceUpdate();
				};
				if (obj.type == etg.Spell && obj.card.type != etg.Spell) {
					cb();
				} else {
					game.getTarget(obj, obj.active.get('cast'), cb);
					this.forceUpdate();
				}
			}
		}

		gameStep(cmds) {
			const { game } = this.props;
			if (game.turn == game.player2 && game.ai) {
				if (game.phase == etg.PlayPhase) {
					if (!this.aiCommand) {
						Effect.disable = true;
						if (this.aiState) {
							this.aiState.step(game);
						} else {
							this.aiState = new aiSearch(game);
						}
						Effect.disable = false;
						if (this.aiState.cmd) {
							this.aiCommand = true;
						}
					}
					let now;
					if (this.aiCommand && (now = Date.now()) > this.aiDelay) {
						cmds[this.aiState.cmd]({ bits: this.aiState.cmdct });
						this.aiState = null;
						this.aiCommand = false;
						this.aiDelay = now + (game.turn == game.player1 ? 2000 : 200);
					}
				}
			}
			const effects = Effect.next(game.player2.isCloaked());
			if (effects !== this.state.effects) {
				this.setState({ effects });
			}
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which,
				ch = String.fromCharCode(kc);
			let chi;
			if (kc == 27) {
				this.resignClick();
			} else if (ch == ' ' || kc == 13) {
				this.endClick();
			} else if (ch == '\b' || ch == '0') {
				this.cancelClick();
			} else if (~(chi = 'SW'.indexOf(ch))) {
				this.playerClick(chi);
			} else if (~(chi = 'QA'.indexOf(ch))) {
				const { shield } = this.props.game.players(chi);
				if (shield) this.thingClick(shield);
			} else if (~(chi = 'ED'.indexOf(ch))) {
				const { weapon } = this.props.game.players(chi);
				if (weapon) this.thingClick(weapon);
			} else if (~(chi = '12345678'.indexOf(ch))) {
				const card = this.props.game.player1.hand[chi];
				if (card) this.thingClick(card);
			} else return;
			e.preventDefault();
		};

		startMatch({ game, data, dispatch }) {
			Effect.clear();
			const cmds = {
				end: data => {
					game.player2.endturn(data.bits);
					this.forceUpdate();
				},
				cast: data => {
					const bits = data.bits,
						c = game.bitsToTgt(bits & 511),
						t = game.bitsToTgt((bits >> 9) & 511);
					let play;
					if (c.type == etg.Spell) {
						play = c.card;
					} else {
						play = {
							element: c.card.element,
							costele: c.castele,
							cost: c.cast,
							name: c.active.get('cast').name[0],
							upped: c.card.upped,
							shiny: c.card.shiny,
						};
					}
					this.setState({ foeplays: this.state.foeplays.concat([play]) });
					c.useactive(t);
				},
				resign: data => {
					game.setWinner(data.c);
					this.forceUpdate();
				},
				foeleft: () => {
					if (!game.ai) game.setWinner(game.player1);
					this.forceUpdate();
				},
			};
			this.gameStep(cmds);
			const gameInterval = setInterval(() => this.gameStep(cmds), 30);
			dispatch(store.setCmds(cmds));
		}

		componentDidMount() {
			document.addEventListener('keydown', this.onkeydown);
			this.startMatch(this.props);
		}

		componentWillUnmount() {
			clearInterval(this.gameInterval);
			document.removeEventListener('keydown', this.onkeydown);
			this.props.dispatch(store.setCmds({}));
		}

		UNSAFE_componentWillReceiveProps(props) {
			if (props.game !== this.props.game) {
				clearInterval(this.gameInterval);
				this.startMatch(props);
			}
		}

		setInfo(e, obj, x) {
			const actinfo =
				this.props.game.targeting &&
				this.props.game.targeting.filter(obj) &&
				activeInfo[this.props.game.targeting.text];
			this.setState({
				tooltip:
					obj.info() + (actinfo ? '\n' + actinfo(obj, this.props.game) : ''),
				toolx: e.pageX,
				tooly: e.pageY,
			});
			if (obj.type !== etg.Player) {
				this.setCard(e, obj.card, x);
			}
		}

		clearCard() {
			this.setState({ hovercode: 0, tooltip: '' });
		}

		setCard(e, card, x) {
			this.setState({
				hovercode: card.code,
				hoverx: x - 64,
				hovery: e.pageY > 300 ? 44 : 300,
			});
		}

		render() {
			const { game } = this.props,
				children = [svgbg];
			let turntell, endText, cancelText;
			const cloaked = game.player2.isCloaked();
			if (game.phase != etg.EndPhase) {
				turntell = this.state.discarding
					? 'Discard'
					: game.targeting
					? game.targeting.text
					: game.turn == game.player1
					? 'Your Turn'
					: 'Their Turn';
				if (game.turn == game.player1) {
					endText = this.state.discarding
						? ''
						: game.phase == etg.PlayPhase
						? 'End Turn'
						: 'Accept Hand';
					cancelText =
						game.phase != etg.PlayPhase
							? 'Mulligan'
							: game.targeting || this.state.discarding || this.state.resigning
							? 'Cancel'
							: '';
				} else cancelText = endText = '';
			} else {
				turntell =
					(game.turn == game.player1 ? 'Your' : 'Their') +
					' Turn' +
					(game.winner == game.player1 ? ', Won' : ', Lost');
				endText = 'Continue';
				cancelText = '';
			}
			children.push(cloaked && cloaksvg);
			const foeplaydom = [];
			if (!cloaked) {
				for (let i = 0; i < this.state.foeplays.length; i++) {
					let play = this.state.foeplays[i];
					foeplaydom.push(
						<Components.CardImage
							key={'foeplay' + i}
							x={(i & 7) * 99}
							y={(i >> 3) * 19}
							card={play}
							onMouseOver={e => {
								if (play instanceof Card) {
									this.setCard(e, play, e.pageX);
								}
							}}
							onMouseOut={() => this.clearCard()}
						/>,
					);
				}
			}
			children.push(foeplaydom);
			let floodvisible = false;
			for (let j = 0; j < 2; j++) {
				const pl = game.players(j);

				const plpos = ui.tgtToPos(pl);
				children.push(
					<div
						className={tgtclass(game, pl)}
						style={{
							position: 'absolute',
							left: plpos.x - 48 + 'px',
							top: plpos.y - 40 + 'px',
							width: '96px',
							height: '80px',
							border: 'transparent 2px solid',
						}}
						onClick={() => this.playerClick(j)}
						onMouseOver={e => this.setInfo(e, pl)}
					/>,
					<span
						className={'ico e' + pl.mark}
						style={{
							position: 'absolute',
							left: j ? '160px' : '740px',
							top: j ? '130px' : '470px',
							transform: 'translate(-50%,-50%)',
							textAlign: 'center',
							pointerEvents: 'none',
							fontSize: '18px',
							textShadow: '2px 2px 1px #000,2px 2px 2px #000',
						}}>
						{pl.markpower !== 1 && pl.markpower}
					</span>,
				);
				children.push(
					!!pl.sosa && (
						<div
							className={'ico sacrifice'}
							style={{
								position: 'absolute',
								left: j ? '800px' : '0',
								top: j ? '7px' : '502px',
								pointerEvents: 'none',
							}}
						/>
					),
				);
				const handOverlay = pl.silence
					? 'ico silence'
					: pl.sanctuary
					? 'ico sanctuary'
					: pl.nova >= 3 && pl.hand.some(c => c.card.isOf(Cards.Names.Nova))
					? 'ico singularity'
					: '';
				children.push(
					handOverlay && (
						<span
							className={handOverlay}
							style={{
								position: 'absolute',
								left: j ? '3px' : '759px',
								top: j ? '75px' : '305px',
							}}
						/>
					),
				);
				const handdom = [];
				for (let i = 0; i < pl.hand.length; i++) {
					handdom.push(
						<ThingInst
							obj={pl.hand[i]}
							game={game}
							setGame={() => this.forceUpdate()}
							setInfo={(e, obj, x) => this.setCard(e, obj.card, x)}
							onMouseOut={() => this.clearCard()}
							onClick={obj => this.thingClick(obj)}
						/>,
					);
				}
				children.push(handdom);
				const creatures = [],
					perms = [];
				for (let i = 0; i < 23; i++) {
					const cr = pl.creatures[i];
					if (cr && !(j == 1 && cloaked)) {
						creatures.push(
							<ThingInst
								key={i}
								obj={cr}
								game={game}
								setGame={() => this.forceUpdate()}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={() => this.clearCard()}
								onClick={obj => this.thingClick(obj)}
							/>,
						);
					}
				}
				for (let i = 0; i < 16; i++) {
					const pr = pl.permanents[i];
					if (pr && pr.status.get('flooding')) floodvisible = true;
					if (pr && !(j == 1 && cloaked && !pr.status.get('cloak'))) {
						perms.push(
							<ThingInst
								key={i}
								obj={pr}
								game={game}
								setGame={() => this.forceUpdate()}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={() => this.clearCard()}
								onClick={obj => this.thingClick(obj)}
							/>,
						);
					}
				}
				if (j == 1) {
					creatures.reverse();
					perms.reverse();
				}
				children.push(creatures, perms);
				const wp = pl.weapon;
				children.push(
					wp && !(j == 1 && cloaked) && (
						<ThingInst
							obj={wp}
							game={game}
							setGame={() => this.forceUpdate()}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={() => this.clearCard()}
							onClick={obj => this.thingClick(obj)}
						/>
					),
				);
				const sh = pl.shield;
				children.push(
					sh && !(j == 1 && cloaked) && (
						<ThingInst
							obj={sh}
							game={game}
							setGame={() => this.forceUpdate()}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={() => this.clearCard()}
							onClick={obj => this.thingClick(obj)}
						/>
					),
				);
				const qx = j ? 792 : 0,
					qy = j ? 106 : 308;
				for (let k = 1; k < 13; k++) {
					children.push(
						<span
							className={'ico e' + k}
							style={{
								position: 'absolute',
								left: qx + (k & 1 ? 0 : 54) + 'px',
								top: qy + Math.floor((k - 1) / 2) * 32 + 'px',
							}}
						/>,
						<span
							style={{
								position: 'absolute',
								left: qx + (k & 1 ? 32 : 86) + 'px',
								top: qy + Math.floor((k - 1) / 2) * 32 + 4 + 'px',
								fontSize: '16px',
								pointerEvents: 'none',
							}}>
							{pl.quanta[k] || ''}
						</span>,
					);
				}
				children.push(
					<div
						style={{
							backgroundColor: '#000',
							position: 'absolute',
							left: plpos.x - 41 + 'px',
							top: j ? '36px' : '531px',
							width: '82px',
							height: '16px',
							pointerEvents: 'none',
						}}
					/>,
				);
				const hpdom = [];
				if (pl.hp > 0) {
					hpdom.push(
						<div
							style={{
								backgroundColor: ui.strcols[etg.Life],
								position: 'absolute',
								left: plpos.x - 40 + 'px',
								top: j ? '37px' : '532px',
								width: (80 * pl.hp) / pl.maxhp + 'px',
								height: '14px',
								pointerEvents: 'none',
							}}
						/>,
					);
					if (!cloaked && game.expectedDamage[j]) {
						const x1 = (80 * pl.hp) / pl.maxhp;
						const x2 =
							x1 - (80 * Math.min(game.expectedDamage[j], pl.hp)) / pl.maxhp;
						hpdom.push(
							<div
								style={{
									backgroundColor:
										ui.strcols[
											game.expectedDamage[j] >= pl.hp
												? etg.Fire
												: game.expectedDamage[j] > 0
												? etg.Time
												: etg.Water
										],
									position: 'absolute',
									left: plpos.x - 40 + Math.min(x1, x2),
									top: j ? '37px' : '532px',
									width: Math.max(x1, x2) - Math.min(x1, x2) + 'px',
									height: '14px',
									pointerEvents: 'none',
								}}
							/>,
						);
					}
				}
				children.push(hpdom);
				const poison = pl.status.get('poison'),
					poisoninfo =
						(poison > 0
							? poison + ' 1:2'
							: poison < 0
							? -poison + ' 1:7'
							: '') + (pl.status.get('neuro') ? ' 1:10' : '');
				const hptext =
					pl.hp +
					'/' +
					pl.maxhp +
					'\n' +
					pl.deck.length +
					'cards' +
					(!cloaked && game.expectedDamage[j]
						? '\nDmg: ' + game.expectedDamage[j]
						: '') +
					(poisoninfo ? '\n' + poisoninfo : '');
				children.push(
					<Components.Text
						text={hptext}
						style={{
							textAlign: 'center',
							width: '100px',
							pointerEvents: 'none',
							fontSize: '12px',
							lineHeight: '1.1',
							position: 'absolute',
							left: j ? '800px' : '0px',
							top: j ? '36px' : '531px',
						}}
					/>,
				);
			}
			children.push(
				floodvisible && floodsvg,
				<div
					style={{
						whiteSpace: 'pre-wrap',
						textAlign: 'center',
						position: 'absolute',
						left: '0px',
						top: '40px',
						width: '140px',
					}}>
					{this.props.game.foename || '-'}
				</div>,
				<span
					style={{
						position: 'absolute',
						left: '762px',
						top: '580px',
						pointerEvents: 'none',
					}}>
					{turntell}
				</span>,
				this.state.effects,
			);
			children.push(
				!!this.state.hovercode && (
					<Components.Card
						x={this.state.hoverx}
						y={this.state.hovery}
						code={this.state.hovercode}
					/>
				),
			);
			children.push(
				this.state.tooltip && (
					<Components.Text
						className="infobox"
						text={this.state.tooltip}
						icoprefix="te"
						style={{
							position: 'absolute',
							left: this.state.toolx + 'px',
							top: this.state.tooly + 'px',
						}}
					/>
				),
			);
			children.push(
				<input
					type="button"
					value={this.state.resigning ? 'Confirm' : 'Resign'}
					onClick={() => this.resignClick()}
					style={{
						position: 'absolute',
						left: '8px',
						top: '20px',
					}}
				/>,
			);
			children.push(
				cancelText && (
					<input
						type="button"
						value={cancelText}
						onClick={() => this.cancelClick()}
						style={{
							position: 'absolute',
							left: '800px',
							top: '560px',
						}}
					/>
				),
			);
			children.push(
				endText && (
					<input
						type="button"
						value={endText}
						onClick={() => this.endClick()}
						style={{
							position: 'absolute',
							left: '800px',
							top: '530px',
						}}
					/>
				),
			);

			return children;
		}
	},
);
