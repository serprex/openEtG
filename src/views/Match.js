'use strict';
const ui = require('../ui'),
	etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Card = require('../Card'),
	Cards = require('../Cards'),
	Effect = require('../Effect'),
	Skills = require('../Skills'),
	aiSearch = require('../ai/search'),
	Components = require('../Components'),
	store = require('../store'),
	sfx = require('../audio'),
	{ connect } = require('react-redux'),
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
	firebolt: (t, game) =>
		3 +
		Math.floor(
			(game.player1.quanta[etg.Fire] - game.targeting.src.card.cost) / 4,
		),
	drainlife: (t, game) =>
		2 +
		Math.floor(
			(game.player1.quanta[etg.Darkness] - game.targeting.src.card.cost) / 5,
		),
	icebolt: (t, game) => {
		const bolts = Math.floor(
			(game.player1.quanta[etg.Water] - game.targeting.src.card.cost) / 5,
		);
		return `${2 + bolts} ${35 + bolts * 5}%`;
	},
	catapult: t =>
		Math.ceil(
			(t.truehp() * (t.getStatus('frozen') ? 150 : 100)) / (t.truehp() + 100),
		),
	adrenaline: t => 'Extra: ' + etg.getAdrenalRow(t.trueatk()),
	fractal: (t, game) =>
		'Copies: ' +
		Math.min(
			6 +
				Math.floor(
					(game.player1.quanta[etg.Aether] - game.targeting.src.card.cost) / 2,
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
			obj.ownerId == game.player2Id &&
			!game.player1.precognition
		) {
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
		);
	},
);

function addNoHealData(game) {
	const data = game.dataNext || {};
	if (game.noheal) {
		data.p1hp = Math.max(game.player1.hp, 1);
		data.p1maxhp = game.player1.maxhp;
	}
	return data;
}

function tgtclass(game, obj) {
	if (game.targeting) {
		if (game.targeting.filter(obj)) return 'ants-red';
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
			this.aiCommand = false;
			this.aiDelay = 0;
			this.streakback = 0;
			this.state = {
				tooltip: null,
				foeplays: [],
				discarding: false,
				resigning: false,
				effects: null,
			};
		}

		endClick = discard => {
			const { game, user } = this.props;
			if (game.turn == game.player1.id && game.phase === etg.MulliganPhase) {
				if (!game.ai) sock.emit('mulligan', { draw: true });
				game.progressMulligan();
			} else if (game.winner) {
				if (user) {
					if (game.arena) {
						sock.userEmit('modarena', {
							aname: game.arena,
							won: game.winner == game.player2.id,
							lv: game.level - 4,
						});
					}
					if (game.winner == game.player1.id) {
						if (game.quest) {
							if (game.quest.autonext) {
								const data = addNoHealData(game);
								const newgame = require('../Quest').mkQuestAi(
									game.quest.autonext,
								);
								newgame.game.addData(data);
								newgame.data.rematch = this.props.data.rematch;
								newgame.data.rematchFilter = this.props.data.rematchFilter;
								mkAi.run(newgame);
								return;
							} else if (!user.quests[game.quest.key]) {
								sock.userExec('setquest', { quest: game.quest.key });
							}
						} else if (game.daily) {
							if (game.endurance) {
								const data = addNoHealData(game);
								data.endurance--;
								const newgame = mkAi.mkAi(game.level, true)();
								newgame.game.addData(data);
								newgame.game.dataNext = data;
								newgame.data.rematch = this.props.data.rematch;
								newgame.data.rematchFilter = this.props.data.rematchFilter;
								mkAi.run(newgame);
								return;
							} else {
								sock.userExec('donedaily', {
									daily: game.daily == 4 ? 5 : game.daily == 3 ? 0 : game.daily,
								});
							}
						}
					}
				}
				this.props.dispatch(
					store.doNav(require('./Result'), {
						game: game,
						data: this.props.data,
						streakback: this.streakback,
					}),
				);
			} else if (game.turn == game.player1.id) {
				if (discard == undefined && game.player1.handIds.length == 8) {
					this.setState({ discarding: true });
				} else {
					if (!game.ai) sock.emit('endturn', { bits: discard });
					game.player1.endturn(discard);
					game.targeting = null;
					this.setState({ discarding: false, foeplays: [] });
				}
			}
		};

		cancelClick = () => {
			const { game } = this.props;
			if (this.state.resigning) {
				this.setState({ resigning: false });
			} else if (game.turn == game.player1.id) {
				if (game.phase === etg.MulliganPhase && game.player1.handIds.length) {
					sfx.playSound('mulligan');
					game.player1.drawhand(game.player1.handIds.length - 1);
					if (!game.ai) sock.emit('mulligan');
					this.forceUpdate();
				} else if (game.targeting) {
					game.targeting = null;
					this.forceUpdate();
				} else this.setState({ discarding: false });
			}
		};

		resignClick = () => {
			const { game } = this.props;
			if (this.state.resigning) {
				if (!game.ai) sock.emit('foeleft');
				game.setWinner(game.player2Id);
				this.endClick();
			} else {
				this.setState({ resigning: true });
			}
		};

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

		thingClick = obj => {
			const { game } = this.props;
			this.clearCard();
			if (game.phase != etg.PlayPhase) return;
			if (obj.ownerId == game.player1Id && this.state.discarding) {
				if (obj.type == etg.Spell) this.endClick(obj.getIndex());
			} else if (game.targeting) {
				if (game.targeting.filter(obj)) {
					game.targeting.cb(obj);
					this.forceUpdate();
				}
			} else if (obj.ownerId == game.player1Id && obj.canactive()) {
				const cb = tgt => {
					if (!game.ai) {
						sock.emit('cast', {
							bits: game.tgtToBits(obj) | (game.tgtToBits(tgt) << 9),
						});
					}
					obj.useactive(tgt);
					this.forceUpdate();
				};
				if (obj.type === etg.Spell && obj.card.type !== etg.Spell) {
					cb();
				} else {
					game.getTarget(obj, obj.active.get('cast'), cb);
					this.forceUpdate();
				}
			}
		};

		gameStep(cmds) {
			const { game } = this.props;
			if (game.turn == game.player2.id && game.ai) {
				if (game.phase == etg.PlayPhase) {
					let now;
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
					} else if ((now = Date.now()) > this.aiDelay) {
						cmds[this.aiState.cmd]({ bits: this.aiState.cmdct });
						this.aiState = null;
						this.aiCommand = false;
						this.aiDelay = now + (game.turn == game.player1.id ? 2000 : 200);
					}
				} else if (game.phase === etg.MulliganPhase) {
					cmds.mulligan({ draw: require('../ai/mulligan')(game.player2) });
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
			if (
				this.props.user &&
				!game.endurance &&
				(game.level !== undefined || !game.ai)
			) {
				sock.userExec('addloss', {
					pvp: !game.ai,
					l: game.level,
					g: -game.cost,
				});
				this.streakback = this.props.user.streak[game.level];
			}
			Effect.clear();
			const cmds = {
				endturn: data => {
					(data.spectate == 1 ? game.player1 : game.player2).endturn(data.bits);
					if (data.spectate) this.setState({ foeplays: [] });
					this.forceUpdate();
				},
				cast: data => {
					const bits = data.spectate == 1 ? data.bits ^ 4104 : data.bits,
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
				foeleft: data => {
					if (!game.ai)
						game.setWinner(
							data.spectate == 1 ? game.player2Id : game.player1Id,
						);
					this.forceUpdate();
				},
				mulligan: data => {
					if (data.draw === true) {
						game.progressMulligan();
					} else {
						const pl = data.spectate == 1 ? game.player1 : game.player2;
						sfx.playSound('mulligan');
						pl.drawhand(pl.handIds.length - 1);
					}
					this.forceUpdate();
				},
			};
			this.gameStep(cmds);
			this.gameInterval = setInterval(() => this.gameStep(cmds), 30);
			dispatch(store.setCmds(cmds));
		}

		componentDidMount() {
			if (sock.trade) {
				sock.userEmit('canceltrade');
				delete sock.trade;
			}
			if (!this.props.data.spectate) {
				document.addEventListener('keydown', this.onkeydown);
			}
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
				tooltip: (
					<Components.Text
						className="infobox"
						text={
							obj.info() + (actinfo ? '\n' + actinfo(obj, this.props.game) : '')
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

			if (game.phase != etg.EndPhase) {
				turntell = this.state.discarding
					? 'Discard'
					: game.targeting
					? game.targeting.text
					: `${game.turn == game.player1.id ? 'Your' : 'Their'} Turn` +
					  (game.phase > etg.MulliganPhase
							? ''
							: game.first == game.player1
							? ', First'
							: ', Second');
				if (game.turn == game.player1.id) {
					endText = this.state.discarding
						? ''
						: game.phase == etg.PlayPhase
						? 'End Turn'
						: game.turn == game.player1.id
						? 'Accept Hand'
						: '';
					cancelText =
						game.phase != etg.PlayPhase
							? game.turn == game.player1.id
								? 'Mulligan'
								: ''
							: game.targeting || this.state.discarding || this.state.resigning
							? 'Cancel'
							: '';
				} else cancelText = endText = '';
			} else {
				turntell = `${game.turn == game.player1.id ? 'Your' : 'Their'} Turn, ${
					game.winner == game.player1.id ? 'Won' : 'Lost'
				}`;
				endText = 'Continue';
				cancelText = '';
			}
			let floodvisible = false;
			for (let j = 0; j < 2; j++) {
				const pl = game.players(j);

				const plpos = ui.tgtToPos(pl);
				const handOverlay = pl.usedactive
					? 'ico silence'
					: pl.sanctuary
					? 'ico sanctuary'
					: pl.nova >= 3 && pl.hand.some(c => c.card.isOf(Cards.Nova))
					? 'ico singularity'
					: '';
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
					!!pl.flatline && (
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
				const cards = [],
					creatures = [],
					perms = [];
				for (let i = 0; i < pl.handIds.length; i++) {
					cards.push(
						<ThingInst
							key={i}
							obj={pl.hand[i]}
							game={game}
							setGame={() => this.forceUpdate()}
							setInfo={(e, obj, x) => this.setCard(e, obj.card, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
						/>,
					);
				}
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
								onMouseOut={this.clearCard}
								onClick={this.thingClick}
							/>,
						);
					}
				}
				for (let i = 0; i < 16; i++) {
					const pr = pl.permanents[i];
					if (pr && pr.getStatus('flooding')) floodvisible = true;
					if (pr && !(j == 1 && cloaked && !pr.getStatus('cloak'))) {
						perms.push(
							<ThingInst
								key={i}
								obj={pr}
								game={game}
								setGame={() => this.forceUpdate()}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={this.clearCard}
								onClick={this.thingClick}
							/>,
						);
					}
				}
				if (j == 1) {
					creatures.reverse();
					perms.reverse();
				}
				children.push(cards, creatures, perms);
				const wp = pl.weapon;
				children.push(
					wp && !(j == 1 && cloaked) && (
						<ThingInst
							obj={wp}
							game={game}
							setGame={() => this.forceUpdate()}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
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
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
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
				const x1 = (80 * pl.hp) / pl.maxhp;
				const x2 =
					x1 - (80 * Math.min(game.expectedDamage[j], pl.hp)) / pl.maxhp;
				const poison = pl.getStatus('poison'),
					poisoninfo = `${
						poison > 0 ? poison + ' 1:2' : poison < 0 ? -poison + ' 1:7' : ''
					} ${pl.getStatus('neuro') ? ' 1:10' : ''}`;
				const hptext = `${pl.hp}/${pl.maxhp}\n${pl.deckIds.length}cards${
					!cloaked && game.expectedDamage[j]
						? `\nDmg: ${game.expectedDamage[j]}`
						: ''
				} ${poisoninfo ? `\n${poisoninfo}` : ''}`;
				children.push(
					pl.hp > 0 && (
						<>
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
							/>
							{!cloaked && game.expectedDamage[j] !== 0 && (
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
								/>
							)}
						</>
					),
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
						][this.props.game.level] || '') + (this.props.game.foename || '-')}
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
					{!this.props.data.spectate &&
						(game.turn == game.player1.id || game.winner) && (
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
