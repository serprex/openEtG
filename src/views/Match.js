'use strict';
const imm = require('immutable'),
	ui = require('../ui'),
	etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Card = require('../Card'),
	Cards = require('../Cards'),
	Effect = require('../Effect'),
	Skills = require('../Skills'),
	aiSearch = require('../ai/search'),
	aiMulligan = require('../ai/mulligan'),
	Components = require('../Components'),
	store = require('../store'),
	sfx = require('../audio'),
	{ connect } = require('react-redux'),
	{ Motion, spring } = require('react-motion'),
	React = require('react');

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
			path += `M${redhor[i + 1]} ${redhor[i] - j}L${redhor[i + 2]} ${redhor[i] -
				j}`;
		}
		for (let i = 0; i < redver.length; i += 3) {
			path += `M${redver[i] + j} ${redver[i + 1]}L${redver[i] + j} ${
				redver[i + 2]
			}`;
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
			opacity: '.4',
		}}>
		<path
			d="M149 146l644 0l0 64l-400 0l0 64l-244 0zM107 454l644 0l0-128l-244 0l0 64l-400 0z"
			fill="#048"
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
	firebolt: (t, game, targeting) =>
		3 +
		Math.floor((game.player1.quanta[etg.Fire] - targeting.src.card.cost) / 4),
	drainlife: (t, game, targeting) =>
		2 +
		Math.floor(
			(game.player1.quanta[etg.Darkness] - targeting.src.card.cost) / 5,
		),
	icebolt: (t, game, targeting) => {
		const bolts = Math.floor(
			(game.player1.quanta[etg.Water] - targeting.src.card.cost) / 5,
		);
		return `${2 + bolts} ${35 + bolts * 5}%`;
	},
	catapult: t =>
		Math.ceil(
			(t.truehp() * (t.getStatus('frozen') ? 150 : 100)) / (t.truehp() + 100),
		),
	adrenaline: t => 'Extra: ' + etg.getAdrenalRow(t.trueatk()),
	fractal: (t, game, targeting) =>
		'Copies: ' +
		Math.min(
			6 +
				Math.floor(
					(game.player1.quanta[etg.Aether] - targeting.src.card.cost) / 2,
				),
			9 - game.player1.handIds.length,
		),
};

const ThingInst = connect(({ opts }) => ({ lofiArt: opts.lofiArt }))(
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
		if (
			isSpell &&
			obj.ownerId === game.player2Id &&
			!game.player1.getStatus('precognition')
		) {
			return (
				<Motion style={{ x: spring(pos.x), y: spring(pos.y) }}>
					{pos => (
						<div
							style={{
								position: 'absolute',
								left: `${pos.x - 32}px`,
								top: `${pos.y - 38}px`,
								width: '68px',
								height: '80px',
								border: 'transparent 2px solid',
							}}
							className={tgtclass(game, obj, props.targeting)}
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
					)}
				</Motion>
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
			obj.id == obj.owner.gpull,
			obj.getStatus('frozen'),
		];
		for (let k = 0; k < 7; k++) {
			if (!isSpell && visible[k]) {
				children.push(
					<div
						className={`ico s${k}`}
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
						className={`ico sborder${k}`}
						key={7 + k}
						style={{
							position: 'absolute',
							left: '0',
							top: '0',
							transform: scale === 1 ? undefined : `scale(${scale})`,
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
					charges ? ` x${charges}` : ''
				}`;
			} else if (obj.type === etg.Permanent) {
				if (obj.card.type === etg.Pillar) {
					statText = `1:${
						obj.getStatus('pendstate') ? obj.owner.mark : obj.card.element
					} x${charges}`;
					topText = '';
				} else if (obj.active.get('ownattack') === Skills.locket) {
					statText = `1:${obj.getStatus('mode') || obj.owner.mark}`;
				} else {
					statText = (charges || '').toString();
				}
			} else if (obj.type === etg.Weapon) {
				statText = `${obj.trueatk()}${charges ? ` x${charges}` : ''}`;
			} else if (obj.type === etg.Shield) {
				statText = charges ? 'x' + charges : obj.truedr().toString();
			}
		} else {
			statText = `${obj.card.cost}:${obj.card.costele}`;
		}
		return (
			<Motion style={{ x: spring(pos.x), y: spring(pos.y) }}>
				{pos => (
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
						className={tgtclass(game, obj, props.targeting)}
						onMouseOut={props.onMouseOut}
						onClick={() => props.onClick(obj)}>
						{props.lofiArt ? (
							<div
								key={0}
								className={obj.card.shiny ? 'shiny' : undefined}
								style={{
									position: 'absolute',
									left: '0',
									top: isSpell ? '0' : '10px',
									width: 64 * scale + 'px',
									height: 64 * scale + 'px',
									backgroundColor: ui.maybeLightenStr(obj.card),
									pointerEvents: 'none',
								}}>
								{obj.card ? obj.card.name : obj.name}
							</div>
						) : (
							<img
								key={0}
								className={obj.card.shiny ? 'shiny' : undefined}
								src={`/Cards/${obj.card.code.toString(32)}.png`}
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
						)}
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
						{obj.hasactive('prespell', 'protectonce') && (
							<div
								className="ico protection"
								style={{
									position: 'absolute',
									left: '0',
									top: '0',
								}}
							/>
						)}
					</div>
				)}
			</Motion>
		);
	},
);

function addNoHealData(game) {
	const data = game.get(game.id, 'data'),
		dataNext = { ...data.get('dataNext') };
	if (data.get('noheal')) {
		dataNext.p1hp = Math.max(game.player1.hp, 1);
		dataNext.p1maxhp = game.player1.maxhp;
	}
	return dataNext;
}

function tgtclass(game, obj, targeting) {
	if (targeting) {
		if (targeting.filter(obj)) return 'ants-red';
	} else if (obj.ownerId === game.player1Id && obj.canactive())
		return 'canactive';
}

function FoePlays({ foeplays, setCard, clearCard }) {
	return foeplays.map((play, i) => (
		<Components.CardImage
			key={i}
			x={(i & 7) * 99}
			y={(i >> 3) * 19}
			card={play}
			onMouseOver={e => {
				if (play instanceof Card) {
					setCard(e, play, e.pageX);
				}
			}}
			onMouseOut={clearCard}
		/>
	));
}

module.exports = connect(({ user }) => ({ user }))(
	class Match extends React.Component {
		constructor(props) {
			super(props);
			this.aiState = null;
			this.aiDelay = 0;
			this.streakback = 0;
			this.state = {
				tooltip: null,
				foeplays: [],
				resigning: false,
				effects: null,
				gameProps: null,
				expectedDamage: new Int16Array(2),
			};
		}

		applyNext = data => {
			const { game } = this.props;
			if (data.x === 'cast' && game.turn === game.player2Id) {
				const c = game.byId(data.c);
				const play =
					c.type == etg.Spell
						? c.card
						: {
								element: c.card.element,
								costele: c.castele,
								cost: c.cast,
								name: c.active.get('cast').name[0],
								upped: c.card.upped,
								shiny: c.card.shiny,
						  };
				this.setState(state => ({ foeplays: state.foeplays.concat([play]) }));
			}
			game.next(data);
			switch (data.x) {
				case 'cast':
					break;
				case 'mulligan':
					sfx.playSound('mulligan');
					this.forceUpdate();
					break;
				default:
					this.forceUpdate();
			}
		};

		static getDerivedStateFromProps(nextProps, prevState) {
			if (prevState.resetInterval && nextProps.game !== prevState._game) {
				prevState.resetInterval(nextProps);
				return {
					_game: nextProps.game,
					gameProps: nextProps.game.props,
					expectedDamage: new Int16Array(2),
				};
			} else if (nextProps.game.props !== prevState.gameProps) {
				return {
					gameProps: nextProps.game.props,
					expectedDamage: nextProps.game.expectedDamage(),
				};
			}
			return null;
		}

		endClick = (discard = 0) => {
			const { game, user } = this.props;
			if (game.turn === game.player1Id && game.phase === etg.MulliganPhase) {
				const event = { x: 'accept' };
				if (!game.ai) sock.emit(event);
				this.applyNext(event);
			} else if (game.winner) {
				if (user) {
					if (game.data.get('arena')) {
						sock.userEmit('modarena', {
							aname: game.data.get('arena'),
							won: game.winner === game.player2Id,
							lv: game.level - 4,
						});
					}
					if (game.winner === game.player1Id) {
						if (game.data.get('quest')) {
							if (game.data.get('quest').autonext) {
								const data = addNoHealData(game);
								mkAi.run(
									require('../Quest').mkQuestAi(
										game.data.get('quest').autonext,
										qdata => Object.assign(qdata, data),
									),
								);
								return;
							} else if (!user.quests[game.data.get('quest').key]) {
								sock.userExec('setquest', {
									quest: game.data.get('quest').key,
								});
							}
						} else if (game.data.get('daily')) {
							if (game.data.get('endurance')) {
								const data = addNoHealData(game);
								data.endurance--;
								data.dataNext = data;
								mkAi.run(
									mkAi.mkAi(game.data.get('level'), true, gdata =>
										Object.assign(gdata, data),
									),
								);
								return;
							} else {
								const daily = game.data.get('daily');
								sock.userExec('donedaily', {
									daily: daily == 4 ? 5 : daily === 3 ? 0 : daily,
								});
							}
						}
					}
				}
				this.props.dispatch(
					store.doNav(require('./Result'), {
						game: game,
						streakback: this.streakback,
					}),
				);
			} else if (game.turn === game.player1Id) {
				if (discard === 0 && game.player1.handIds.length == 8) {
					this.setState({
						targeting: {
							filter: obj =>
								obj.type === etg.Spell && obj.ownerId == game.player1Id,
							cb: tgt => {
								this.endClick(tgt.id);
								this.setState({ targeting: null });
							},
							text: 'Discard',
							src: null,
						},
					});
				} else {
					const event = {
						x: 'end',
						t: discard || undefined,
					};
					if (!game.ai) sock.emit(event);
					this.applyNext(event);
					this.setState({ targeting: null, foeplays: [] });
				}
			}
		};

		cancelClick = () => {
			const { game } = this.props;
			if (this.state.resigning) {
				this.setState({ resigning: false });
			} else if (game.turn === game.player1Id) {
				if (game.phase === etg.MulliganPhase && game.player1.handIds.length) {
					sfx.playSound('mulligan');
					const event = { x: 'mulligan' };
					if (!game.ai) sock.emit(event);
					this.applyNext(event);
				} else if (this.state.targeting) {
					this.setState({ targeting: null });
				}
			}
		};

		resignClick = () => {
			const { game } = this.props;
			if (this.state.resigning) {
				const event = { x: 'resign', c: game.player1Id };
				if (!game.ai) sock.emit(event);
				this.applyNext(event);
				this.endClick();
			} else {
				this.setState({ resigning: true });
			}
		};

		playerClick(pl) {
			if (
				this.props.game.phase === etg.PlayPhase &&
				this.state.targeting &&
				this.state.targeting.filter(pl)
			) {
				this.state.targeting.cb(pl);
			}
		}

		thingClick = obj => {
			const { game } = this.props;
			this.clearCard();
			if (game.phase !== etg.PlayPhase) return;
			if (this.state.targeting) {
				if (this.state.targeting.filter(obj)) {
					this.state.targeting.cb(obj);
				}
			} else if (obj.ownerId === game.player1Id && obj.canactive()) {
				const cb = tgt => {
					const event = { x: 'cast', c: obj.id, t: tgt && tgt.id };
					if (!game.ai) {
						sock.emit(event);
					}
					this.applyNext(event);
				};
				if (obj.type === etg.Spell && obj.card.type !== etg.Spell) {
					cb();
				} else {
					const active = obj.active.get('cast'),
						targetFilter = game.targetFilter(obj, active);
					if (!targetFilter) {
						cb();
					} else {
						this.setState({
							targeting: {
								filter: targetFilter,
								cb: tgt => {
									cb(tgt);
									this.setState({ targeting: null });
								},
								text: active.name[0],
								src: obj,
							},
						});
					}
				}
			}
		};

		gameStep() {
			const { game } = this.props;
			if (game.turn === game.player2Id) {
				if (game.ai === 1) {
					if (game.phase === etg.PlayPhase) {
						let now;
						if (!this.aiState || !this.aiState.cmd) {
							Effect.disable = true;
							if (this.aiState) {
								this.aiState.step(game);
							} else {
								this.aiState = new aiSearch(game);
							}
							Effect.disable = false;
						}
						if (
							this.aiState &&
							this.aiState.cmd &&
							(now = Date.now()) > this.aiDelay
						) {
							this.applyNext(this.aiState.cmd);
							this.aiState = null;
							this.aiDelay = now + (game.turn === game.player1Id ? 2000 : 200);
						}
					} else if (game.phase === etg.MulliganPhase) {
						this.applyNext({
							x: aiMulligan(game.player2) ? 'accept' : 'mulligan',
						});
					}
				} else if (game.ai === 2) {
					game.update(game.id, game => {
						const p1 = game.get('player1'),
							p2 = game.get('player2');
						return game.set('player1', p2).set('player2', p1);
					});
					this.forceUpdate();
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
				this.playerClick(this.props.game.players(chi));
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

		startMatch({ user, game, dispatch }) {
			if (
				user &&
				!game.data.get('endurance') &&
				(game.data.get('level') !== undefined || !game.ai)
			) {
				sock.userExec('addloss', {
					pvp: !game.ai,
					l: game.data.get('level'),
					g: -game.data.get('cost'),
				});
				this.streakback = user.streak[game.data.get('level')];
			}
			Effect.clear();
			const gameEvent = data => this.applyNext(data);
			const cmds = {
				end: gameEvent,
				cast: gameEvent,
				accept: gameEvent,
				mulligan: gameEvent,
				resign: gameEvent,
				foeleft: _data => {
					if (!game.ai) {
						game.setWinner(game.player1Id);
						this.forceUpdate();
					}
				},
			};
			this.gameStep();
			this.gameInterval = setInterval(() => this.gameStep(), 30);
			this.setState({
				_game: game,
				resetInterval: props => {
					clearInterval(this.gameInterval);
					this.startMatch(props);
				},
			});
			dispatch(store.setCmds(cmds));
		}

		componentDidMount() {
			if (sock.trade) {
				sock.userEmit('canceltrade');
				delete sock.trade;
			}
			if (!this.props.game.data.get('spectate')) {
				document.addEventListener('keydown', this.onkeydown);
			}
			this.startMatch(this.props);
		}

		componentWillUnmount() {
			clearInterval(this.gameInterval);
			document.removeEventListener('keydown', this.onkeydown);
			this.props.dispatch(store.setCmds({}));
		}

		setInfo(e, obj, x) {
			const actinfo =
				this.state.targeting &&
				this.state.targeting.filter(obj) &&
				activeInfo[this.state.targeting.text];
			this.setState({
				tooltip: (
					<Components.Text
						className="infobox"
						text={
							obj.info() +
							(actinfo
								? '\n' + actinfo(obj, this.props.game, this.state.targeting)
								: '')
						}
						icoprefix="te"
						style={{
							position: 'absolute',
							left: e.pageX + 'px',
							top: e.pageY + 'px',
						}}
					/>
				),
			});
			if (obj.type !== etg.Player) {
				this.setCard(e, obj.card, x);
			}
		}

		clearCard = () => {
			this.setState({ hovercode: 0, tooltip: null });
		};

		setCard(e, card, x) {
			this.setState({
				hovercode: card.code,
				hoverx: x - 64,
				hovery: e.pageY > 300 ? 44 : 300,
			});
		}

		render() {
			const { game } = this.props,
				children = [];
			let turntell, endText, cancelText;
			const cloaked = game.player2.isCloaked();

			if (game.phase !== etg.EndPhase) {
				turntell = this.state.targeting
					? this.state.targeting.text
					: `${game.turn === game.player1Id ? 'Your' : 'Their'} Turn${
							game.phase > etg.MulliganPhase
								? ''
								: game.first === game.player1Id
								? ', First'
								: ', Second'
					  }`;
				if (game.turn === game.player1Id) {
					endText = this.state.targeting
						? ''
						: game.phase === etg.PlayPhase
						? 'End Turn'
						: game.turn === game.player1Id
						? 'Accept Hand'
						: '';
					if (game.phase != etg.PlayPhase) {
						cancelText = game.turn === game.player1Id ? 'Mulligan' : '';
					} else {
						cancelText =
							this.state.targeting || this.state.resigning ? 'Cancel' : '';
					}
				} else cancelText = endText = '';
			} else {
				turntell = `${game.turn === game.player1Id ? 'Your' : 'Their'} Turn, ${
					game.winner === game.player1Id ? 'Won' : 'Lost'
				}`;
				endText = 'Continue';
				cancelText = '';
			}
			let floodvisible = false;
			for (let j = 0; j < 2; j++) {
				const pl = game.players(j),
					plpos = ui.tgtToPos(pl),
					handOverlay = pl.usedactive
						? 'ico silence'
						: pl.getStatus('sanctuary')
						? 'ico sanctuary'
						: pl.getStatus('nova') >= 3 &&
						  pl.hand.some(c => c.card.isOf(Cards.Nova))
						? 'ico singularity'
						: '';
				children.push(
					<div
						className={tgtclass(game, pl, this.state.targeting)}
						style={{
							position: 'absolute',
							left: plpos.x - 48 + 'px',
							top: plpos.y - 40 + 'px',
							width: '96px',
							height: '80px',
							border: 'transparent 2px solid',
						}}
						onClick={() => this.playerClick(pl)}
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
					!!pl.getStatus('sosa') && (
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
					!!pl.getStatus('flatline') && (
						<span
							className="ico sabbath"
							style={{
								position: 'absolute',
								left: j ? '792px' : '0',
								top: j ? '80px' : '288px',
							}}
						/>
					),
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
				const things = [],
					creatures = [],
					perms = [];
				for (let i = 0; i < pl.handIds.length; i++) {
					const inst = pl.hand[i];
					things.push(
						<ThingInst
							key={inst.id}
							obj={inst}
							game={game}
							setInfo={(e, obj, x) => this.setCard(e, obj.card, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
							targeting={this.state.targeting}
						/>,
					);
				}
				for (let i = 0; i < 23; i++) {
					const cr = pl.creatures[i];
					if (cr && !(j === 1 && cloaked)) {
						creatures.push(
							<ThingInst
								key={cr.id}
								obj={cr}
								game={game}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={this.clearCard}
								onClick={this.thingClick}
								targeting={this.state.targeting}
							/>,
						);
					}
				}
				for (let i = 0; i < 16; i++) {
					const pr = pl.permanents[i];
					if (pr && pr.getStatus('flooding')) floodvisible = true;
					if (pr && !(j === 1 && cloaked && !pr.getStatus('cloak'))) {
						perms.push(
							<ThingInst
								key={pr.id}
								obj={pr}
								game={game}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={this.clearCard}
								onClick={this.thingClick}
								targeting={this.state.targeting}
							/>,
						);
					}
				}
				if (j === 1) {
					creatures.reverse();
					perms.reverse();
				}
				things.push(...creatures);
				things.push(...perms);
				const wp = pl.weapon,
					sh = pl.shield;
				things.push(
					wp && !(j === 1 && cloaked) && (
						<ThingInst
							key={wp.id}
							obj={wp}
							game={game}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
							targeting={this.state.targeting}
						/>
					),
					sh && !(j === 1 && cloaked) && (
						<ThingInst
							key={sh.id}
							obj={sh}
							game={game}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
							targeting={this.state.targeting}
						/>
					),
				);
				children.push(things);
				const qx = j ? 792 : 0,
					qy = j ? 106 : 308;
				for (let k = 1; k < 13; k++) {
					children.push(
						<span
							className={'ico e' + k}
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 0 : 54)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 32}px`,
							}}
						/>,
						<span
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 32 : 86)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 32 + 4}px`,
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
							left: `${plpos.x - 41}px`,
							top: j ? '36px' : '531px',
							width: '82px',
							height: '16px',
							pointerEvents: 'none',
						}}
					/>,
				);
				const x1 = Math.max(80 * (pl.hp / pl.maxhp), 0);
				const x2 = Math.max(
					x1 - 80 * (this.state.expectedDamage[j] / pl.maxhp),
					0,
				);
				const poison = pl.getStatus('poison'),
					poisoninfo = `${
						poison > 0 ? poison + ' 1:2' : poison < 0 ? -poison + ' 1:7' : ''
					} ${pl.getStatus('neuro') ? ' 1:10' : ''}`;
				const hptext = `${pl.hp}/${pl.maxhp}\n${pl.deckIds.length}cards${
					!cloaked && this.state.expectedDamage[j]
						? `\nDmg: ${this.state.expectedDamage[j]}`
						: ''
				} ${poisoninfo ? `\n${poisoninfo}` : ''}`;
				children.push(
					<Motion style={{ x1: spring(x1), x2: spring(x2) }}>
						{({ x1, x2 }) => (
							<>
								<div
									style={{
										backgroundColor: ui.strcols[etg.Life],
										position: 'absolute',
										left: `${plpos.x - 40}px`,
										top: j ? '37px' : '532px',
										width: `${x1}px`,
										height: '14px',
										pointerEvents: 'none',
									}}
								/>
								{!cloaked && this.state.expectedDamage[j] !== 0 && (
									<div
										style={{
											backgroundColor:
												ui.strcols[
													this.state.expectedDamage[j] >= pl.hp
														? etg.Fire
														: this.state.expectedDamage[j] > 0
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
									/>
								)}
							</>
						)}
					</Motion>,
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
			return (
				<>
					{svgbg}
					{cloaked ? (
						cloaksvg
					) : (
						<FoePlays
							foeplays={this.state.foeplays}
							setCard={(e, play, x) => this.setCard(e, play, e.pageX)}
							clearCard={this.clearCard}
						/>
					)}
					{children}
					{floodvisible && floodsvg}
					<div
						style={{
							whiteSpace: 'pre-wrap',
							textAlign: 'center',
							position: 'absolute',
							left: '0px',
							top: '40px',
							width: '140px',
						}}>
						{([
							'Commoner\n',
							'Mage\n',
							'Champion\n',
							'Demigod\n',
							'Arena1\n',
							'Arena2\n',
						][this.props.game.data.get('level')] || '') +
							(this.props.game.data.get('foename') || '-')}
					</div>
					<span
						style={{
							position: 'absolute',
							left: '762px',
							top: '580px',
							pointerEvents: 'none',
						}}>
						{turntell}
					</span>
					{this.state.effects}
					<Components.Card
						x={this.state.hoverx}
						y={this.state.hovery}
						code={this.state.hovercode}
					/>
					{this.state.tooltip}
					<input
						type="button"
						value={this.state.resigning ? 'Confirm' : 'Resign'}
						onClick={this.resignClick}
						style={{
							position: 'absolute',
							left: '8px',
							top: '20px',
						}}
					/>
					{!this.props.game.data.get('spectate') &&
						(game.turn === game.player1Id || game.winner) && (
							<>
								{cancelText && (
									<input
										type="button"
										value={cancelText}
										onClick={this.cancelClick}
										style={{
											position: 'absolute',
											left: '800px',
											top: '560px',
										}}
									/>
								)}
								{endText && (
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
								)}
							</>
						)}
				</>
			);
		}
	},
);
