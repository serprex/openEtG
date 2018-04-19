'use strict';
const ui = require('../ui'),
	etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Card = require('../Card'),
	Cards = require('../Cards'),
	Effect = require('../Effect'),
	Game = require('../Game'),
	Skills = require('../Skills'),
	aiSearch = require('../ai/search'),
	Components = require('../Components'),
	store = require('../store'),
	{connect} = require('react-redux'),
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
				strokeWidth='3'
			/>
		);
	}
	return <svg
		width='900'
		height='600'
		style={{
			position: 'absolute',
			left: '0',
			top: '0',
			zIndex: '-8',
			pointerEvents: 'none',
		}}>{redren}</svg>;
})();

const floodsvg = <svg
	width='900'
	height='600'
	style={{
		position: 'absolute',
		left: '0',
		top: '0',
		zIndex: '1',
		pointerEvents: 'none',
	}}>
		<path
			d='M149 146l644 0l0 64l-400 0l0 64l-244 0zM107 454l644 0l0-128l-244 0l0 64l-400 0z'
			fill='#0486' />
	</svg>;

const cloaksvg = <div
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
/>;

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
		return 2 + bolts + ' ' + (35 + bolts * 5) + '%';
	},
	catapult: t =>
		Math.ceil(
			t.truehp() * (t.status.get('frozen') ? 150 : 100) / (t.truehp() + 100),
		),
	adrenaline: t => 'Extra: ' + etg.getAdrenalRow(t.trueatk()),
	fractal: (t, game) =>
		'Copies: ' +
		Math.min(
			6 +
				Math.floor(
					(game.player1.quanta[etg.Aether] - game.targeting.src.card.cost) / 2,
				),
			9 - game.player1.hand.length,
		),
};

const ThingInst = connect(({opts}) => ({ lofiArt: opts.lofiArt }))(function ThingInst(props) {
	const obj = props.obj,
		game = props.game,
		scale =
			obj.type === etg.Weapon || obj.type === etg.Shield
				? 1.2
				: obj.type == etg.Spell ? 0.85 : 1,
		isSpell = obj.type === etg.Spell;
	const children = props.lofiArt ? [
		<div className={obj.card.shiny ? 'shiny' : undefined}
			style={{
				position: 'absolute',
				left: '0',
				top: isSpell ? '0' : '10px',
				width: 64 * scale + 'px',
				height: 64 * scale + 'px',
				backgroundColor: ui.maybeLightenStr(obj.card),
				pointerEvents: 'none',
			}}
		>{obj.card ? obj.card.name : obj.name}</div>
	] : [
		<img className={obj.card.shiny ? 'shiny' : undefined}
			src={'/Cards/' + obj.card.code.toString(32) + '.png'}
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
	];
	const visible = [
		obj.status.get('psionic'),
		obj.status.get('aflatoxin'),
		!obj.status.get('aflatoxin') && obj.status.get('poison') > 0,
		obj.status.get('airborne') || obj.status.get('ranged'),
		obj.status.get('momentum'),
		obj.status.get('adrenaline'),
		obj.status.get('poison') < 0,
	];
	const bordervisible = [
		obj.status.get('delayed'),
		obj == obj.owner.gpull,
		obj.status.get('frozen'),
	];
	for (let k = 0; k < 7; k++) {
		if (!isSpell && visible[k]) {
			children.push(
				<div className={'ico s' + k}
					style={{
						position: 'absolute',
						top: 64 * scale + 10 + 'px',
						left: [32, 8, 8, 0, 24, 16, 8][k] + 'px',
						opacity: '.6',
					}}
				/>
			);
		}
	}
	for (let k = 0; k < 3; k++) {
		if (!isSpell && bordervisible[k]) {
			children.push(
				<div className={'ico sborder' + k}
					style={{
						position: 'absolute',
						left: '0',
						top: '0',
						transform: scale === 1 ? undefined : 'scale(' + scale + ')',
					}}
				/>
			);
		}
	}
	let statText, topText;
	if (!isSpell) {
		const charges = obj.status.get('charges');
		topText = obj.activetext();
		if (obj.type === etg.Creature) {
			statText =
				obj.trueatk() + ' | ' + obj.truehp() + (charges ? ' x' + charges : '');
		} else if (obj.type === etg.Permanent) {
			if (obj.card.type === etg.Pillar) {
				statText =
					'1:' +
					(obj.status.get('pendstate') ? obj.owner.mark : obj.card.element) +
					' x' +
					charges;
				topText = '';
			} else if (obj.active.auto && obj.active.auto === Skills.locket) {
				statText = '1:' + (obj.status.get('mode') || obj.owner.mark);
			} else {
				statText = (charges || '').toString();
			}
		} else if (obj.type === etg.Weapon) {
			statText = obj.trueatk() + (charges ? ' x' + charges : '');
		} else if (obj.type === etg.Shield) {
			statText = charges ? 'x' + charges : obj.truedr().toString();
		}
	} else {
		statText = obj.card.cost + ':' + obj.card.costele;
	}
	if (topText) {
		children.push(
			<Components.Text
				text={topText}
				icoprefix='te'
				style={{
					position: 'absolute',
					left: '0',
					top: '-8px',
					width: 64 * scale + 'px',
					overflow: 'hidden',
					backgroundColor: ui.maybeLightenStr(obj.card),
				}}
			/>
		);
	}
	if (statText) {
		children.push(
			<Components.Text
				text={statText}
				icoprefix='te'
				style={{
					fontSize: '12px',
					position: 'absolute',
					top: isSpell ? '0' : '10px',
					right: '0',
					paddingLeft: '2px',
					backgroundColor: ui.maybeLightenStr(obj.card),
				}}
			/>
		);
	}
	if (obj.hasactive('prespell', 'protectonce')) {
		children.push(
			<div className='ico protection'
				style={{
					position: 'absolute',
					left: '0',
					top: '0',
				}}
			/>
		);
	}
	const pos = ui.tgtToPos(obj);
	return React.createElement('div', Object.assign(
		isSpell && obj.owner == game.player2 && !game.player1.precognition ?
		{
			children: [<div
				className='ico cback'
				style={{
					left: '2px',
					top: '2px',
				}}
			/>],
			style: {
				position: 'absolute',
				left: pos.x - 32 + 'px',
				top: pos.y - 38 + 'px',
				width: '68px',
				height: '80px',
				border: 'transparent 2px solid',
			},
		}
		: {
			children: children,
			style: {
				position: 'absolute',
				left: pos.x - 32 * scale + 'px',
				top: pos.y - 36 * scale + 'px',
				width: 64 * scale + 4 + 'px',
				height: (isSpell ? 64 : 72) * scale + 4 + 'px',
				opacity: obj.isMaterial() ? '1' : '.7',
				color: obj.card.upped ? '#000' : '#fff',
				fontSize: '10px',
				border: 'transparent 2px solid',
				zIndex: !isSpell && obj.status.get('cloak') ? '2' : undefined,
			},
			onMouseOver: props.setInfo && (e => props.setInfo(e, obj, pos.x)),
		},{
			className: tgtclass(game, obj),
			onMouseOut: props.onMouseOut,
			onClick: () => props.onClick(obj),
		})
	);
});

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
	} else if (obj.owner === game.player1 && obj.canactive()) return 'canactive';
}

module.exports = connect()(class Match extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			tooltip: '',
			foeplays: [],
			discarding: false,
			resigning: false,
			effects: null,
			aiState: null,
			aiCommand: false,
			aiDelay: 0,
		};
	}

	endClick(discard) {
		const { game } = this.props;
		if (game.turn == game.player1 && game.phase === etg.MulliganPhase) {
			if (!game.ai) sock.emit('mulligan', { draw: true });
			game.progressMulligan();
		} else if (game.winner) {
			if (sock.user) {
				if (game.arena) {
					sock.userEmit('modarena', {
						aname: game.arena,
						won: game.winner == game.player2,
						lv: game.level - 4,
					});
				}
				if (game.winner == game.player1) {
					if (game.quest) {
						if (game.autonext) {
							const data = addNoHealData(game);
							const newgame = require('../Quest').mkQuestAi(
								game.quest[0],
								game.quest[1] + 1,
								game.area,
							);
							newgame.game.addData(data);
							mkAi.run(newgame);
							return;
						} else if (
							sock.user.quests[game.quest[0]] <= game.quest[1] ||
							!(game.quest[0] in sock.user.quests)
						) {
							sock.userExec('updatequest', {
								quest: game.quest[0],
								newstage: game.quest[1] + 1,
							});
						}
					} else if (game.daily) {
						if (game.endurance) {
							const data = addNoHealData(game);
							data.endurance--;
							const newgame = mkAi.mkAi(game.level, true)();
							newgame.game.addData(data);
							newgame.game.dataNext = data;
							mkAi.run(newgame);
							return;
						} else {
							sock.userExec('donedaily', {
								daily: game.daily == 4 ? 5 : game.daily == 3 ? 0 : game.daily,
							});
						}
					}
				} else if (!game.endurance && game.level !== undefined) {
					sock.user.streak[game.level] = 0;
				}
			}
			this.props.dispatch(store.doNav(require('./Result'), { game: game, data: this.props.data }));
		} else if (game.turn == game.player1) {
			if (discard == undefined && game.player1.hand.length == 8) {
				this.setState({ discarding: true });
			} else {
				if (!game.ai) sock.emit('endturn', { bits: discard });
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
			if (game.phase === etg.MulliganPhase && game.player1.hand.length) {
				game.player1.drawhand(game.player1.hand.length - 1);
				if (!game.ai) sock.emit('mulligan');
				this.forceUpdate();
			} else if (game.targeting) {
				game.targeting = null;
				this.forceUpdate();
			} else this.setState({ discarding: false });
		}
	}

	resignClick() {
		const { game } = this.props;
		if (this.state.resigning) {
			if (!game.ai) sock.emit('foeleft');
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
				game.getTarget(obj, obj.active.cast, cb);
				this.forceUpdate();
			}
		}
	}

	gameStep(cmds) {
		const { game } = this.props;
		if (game.turn == game.player2 && game.ai) {
			if (game.phase == etg.PlayPhase) {
				if (!this.state.aiCommand) {
					Effect.disable = true;
					if (this.state.aiState) {
						this.state.aiState.step(game);
					} else {
						this.setState({aiState: new aiSearch(game)});
					}
					Effect.disable = false;
					if (this.state.aiState.cmd) {
						this.setState({aiCommand: true});
					}
				}
				let now;
				if (this.state.aiCommand && (now = Date.now()) > this.state.aiDelay) {
					cmds[this.state.aiState.cmd]({ bits: this.state.aiState.cmdct });
					this.setState({
						aiState: null,
						aiCommand: false,
						aiDelay: now + (game.turn == game.player1 ? 2000 : 200),
					});
				}
			} else if (game.phase === etg.MulliganPhase) {
				cmds.mulligan({ draw: require('../ai/mulligan')(game.player2) });
			}
		}
		const effects = Effect.next(this.state.cloaked);
		if (effects !== this.state.effects) {
			this.setState({ effects });
		}
	}

	startMatch({ game, data, dispatch }) {
		const self = this;
		if (sock.user && !game.endurance && (game.level !== undefined || !game.ai)) {
			sock.user.streakback = sock.user.streak[game.level];
			sock.userExec('addloss', { pvp: !game.ai, l: game.level, g: -game.cost });
		}
		Effect.clear();
		function onkeydown(e) {
			if (e.target.id == 'chatinput') return;
			const kc = e.which || e.keyCode,
				ch = String.fromCharCode(kc);
			let chi;
			if (kc == 27) {
				self.resignClick();
			} else if (ch == ' ' || kc == 13) {
				self.endClick();
			} else if (ch == '\b' || ch == '0') {
				self.cancelClick();
			} else if (~(chi = 'SW'.indexOf(ch))) {
				self.playerClick(chi);
			} else if (~(chi = "QA".indexOf(ch))) {
				const { shield } = game.players(chi);
				if (shield) self.thingClick(shield);
			} else if (~(chi = "ED".indexOf(ch))) {
				const { weapon } = game.players(chi);
				if (weapon) self.thingClick(weapon);
			} else if (~(chi = "12345678".indexOf(ch))) {
				const card = game.player1.hand[chi];
				if (card) self.thingClick(card);
			} else
				return;
			e.preventDefault();
		}
		const cmds = {
			endturn: function(data) {
				(data.spectate == 1 ? game.player1 : game.player2).endturn(data.bits);
				if (data.spectate) self.setState({ foeplays: [] });
				self.forceUpdate();
			},
			cast: function(data) {
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
						name: c.active.cast.name[0],
						upped: c.card.upped,
						shiny: c.card.shiny,
					};
				}
				self.setState({ foeplays: self.state.foeplays.concat([play]) });
				c.useactive(t);
				self.forceUpdate();
			},
			foeleft: function(data) {
				if (!game.ai)
					game.setWinner(data.spectate == 1 ? game.player2 : game.player1);
				self.forceUpdate();
			},
			mulligan: function(data) {
				if (data.draw === true) {
					game.progressMulligan();
				} else {
					const pl = data.spectate == 1 ? game.player1 : game.player2;
					pl.drawhand(pl.hand.length - 1);
				}
				self.forceUpdate();
			},
		};
		if (!data.spectate) {
			document.addEventListener('keydown', onkeydown);
		}
		this.gameStep(cmds);
		const gameInterval = setInterval(() => this.gameStep(cmds), 30);
		self.setState({
			endnext: function() {
				document.removeEventListener('keydown', onkeydown);
				clearInterval(gameInterval);
			},
		});
		dispatch(store.setCmds(cmds));
	}

	componentDidMount() {
		if (sock.trade) {
			sock.userEmit('canceltrade');
			delete sock.trade;
		}
		this.startMatch(this.props);
	}

	componentWillUnmount() {
		if (this.state.endnext) {
			this.state.endnext();
		}
		this.props.dispatch(store.setCmds({}));
	}

	UNSAFE_componentWillReceiveProps(props) {
		if (props.game !== this.props.game) {
			this.componentWillUnmount();
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
		const self = this,
			{game} = this.props,
			children = [svgbg];
		let turntell, endText, cancelText;
		const cloaked = game.player2.isCloaked();

		if (game.phase != etg.EndPhase) {
			turntell = self.state.discarding
				? 'Discard'
				: game.targeting
					? game.targeting.text
					: (game.turn == game.player1 ? 'Your Turn' : 'Their Turn') +
						(game.phase > etg.MulliganPhase
							? ''
							: game.first == game.player1 ? ', First' : ', Second');
			if (game.turn == game.player1) {
				endText = self.state.discarding
					? ''
					: game.phase == etg.PlayPhase ? 'End Turn' : 'Accept Hand';
				cancelText =
					game.phase != etg.PlayPhase
						? 'Mulligan'
						: game.targeting || self.state.discarding || self.state.resigning
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
		if (cloaked) {
			children.push(cloaksvg);
		} else {
			for (let i = 0; i < self.state.foeplays.length; i++) {
				let play = self.state.foeplays[i];
				children.push(
					<Components.CardImage
						key={'foeplay' + i}
						x={(i & 7) * 99}
						y={(i >> 3) * 19}
						card={play}
						onMouseOver={(e) => {
							if (play instanceof Card) {
								self.setCard(e, play, e.pageX);
							}
						}}
						onMouseOut={() => self.clearCard()}
					/>,
				);
			}
		}
		let floodvisible = false;
		for (let j = 0; j < 2; j++) {
			const pl = game.players(j);

			const plpos = ui.tgtToPos(pl);
			children.push(
				<div className={tgtclass(game, pl)}
					style={{
						position: 'absolute',
						left: plpos.x - 48 + 'px',
						top: plpos.y - 40 + 'px',
						width: '96px',
						height: '80px',
						border: 'transparent 2px solid',
					}}
					onClick={() => self.playerClick(j)}
					onMouseOver={(e) => self.setInfo(e, pl)}
				/>,
				<span className={'ico e' + pl.mark}
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
				</span>
			);
			if (pl.sosa) {
				children.push(
					<div className={'ico sacrifice'}
						style={{
							position: 'absolute',
							left: j ? '800px' : '0',
							top: j ? '7px' : '502px',
							pointerEvents: 'none',
						}}
					/>
				);
			}
			if (pl.flatline) {
				children.push(
					<span className='ico sabbath'
						style={{
							position: 'absolute',
							left: j ? '792px' : '0',
							top: j ? '80px' : '288px',
						}}
					/>
				);
			}
			const handOverlay = pl.usedactive
				? 'ico silence'
				: pl.sanctuary
					? 'ico sanctuary'
					: pl.nova >= 3 && pl.hand.some(c => c.card.isOf(Cards.Nova))
						? 'ico singularity'
						: '';
			if (handOverlay) {
				children.push(
					<span className={handOverlay}
						style={{
							position: 'absolute',
							left: j ? '3px' : '759px',
							top: j ? '75px' : '305px',
						}}
					/>
				);
			}
			for (let i = 0; i < pl.hand.length; i++) {
				children.push(
					<ThingInst
						obj={pl.hand[i]}
						game={game}
						setGame={() => self.forceUpdate()}
						funcEnd={self.endClick.bind(self)}
						setInfo={(e, obj, x) => self.setCard(e, obj.card, x)}
						onMouseOut={() => self.clearCard()}
						onClick={obj => self.thingClick(obj)}
					/>
				);
			}
			const creatures = [], perms = [];
			for (let i = 0; i < 23; i++) {
				const cr = pl.creatures[i];
				if (cr && !(j == 1 && cloaked)) {
					creatures.push(
						<ThingInst
							key={i}
							obj={cr}
							game={game}
							setGame={() => self.forceUpdate()}
							setInfo={(e, obj, x) => self.setInfo(e, obj, x)}
							onMouseOut={() => self.clearCard()}
							onClick={obj => self.thingClick(obj)}
						/>
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
							setGame={() => self.forceUpdate()}
							setInfo={(e, obj, x) => self.setInfo(e, obj, x)}
							onMouseOut={() => self.clearCard()}
							onClick={obj => self.thingClick(obj)}
						/>
					);
				}
			}
			if (j == 1) {
				creatures.reverse();
				perms.reverse();
			}
			children.push(creatures, perms);
			const wp = pl.weapon;
			if (wp && !(j == 1 && cloaked)) {
				children.push(
					<ThingInst
						obj={wp}
						game={game}
						setGame={() => self.forceUpdate()}
						setInfo={(e, obj, x) => self.setInfo(e, obj, x)}
						onMouseOut={() => self.clearCard()}
						onClick={obj => self.thingClick(obj)}
					/>
				);
			}
			const sh = pl.shield;
			if (sh && !(j == 1 && cloaked)) {
				children.push(
					<ThingInst
						obj={sh}
						game={game}
						setGame={() => self.forceUpdate()}
						setInfo={(e, obj, x) => self.setInfo(e, obj, x)}
						onMouseOut={() => self.clearCard()}
						onClick={obj => self.thingClick(obj)}
					/>
				);
			}
			const qx = j ? 792 : 0,
				qy = j ? 106 : 308;
			for (let k = 1; k < 13; k++) {
				children.push(
					<span className={'ico e' + k}
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
					</span>
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
				/>
			);
			if (pl.hp > 0) {
				children.push(
					<div
						style={{
							backgroundColor: ui.strcols[etg.Life],
							position: 'absolute',
							left: plpos.x - 40 + 'px',
							top: j ? '37px' : '532px',
							width: 80 * pl.hp / pl.maxhp + 'px',
							height: '14px',
							pointerEvents: 'none',
						}}
					/>
				);
				if (!cloaked && game.expectedDamage[j]) {
					const x1 = 80 * pl.hp / pl.maxhp;
					const x2 =
						x1 - 80 * Math.min(game.expectedDamage[j], pl.hp) / pl.maxhp;
					children.push(
						<div
							style={{
								backgroundColor:
									ui.strcols[
										game.expectedDamage[j] >= pl.hp
											? etg.Fire
											: game.expectedDamage[j] > 0 ? etg.Time : etg.Water
									],
								position: 'absolute',
								left: plpos.x - 40 + Math.min(x1, x2),
								top: j ? '37px' : '532px',
								width: Math.max(x1, x2) - Math.min(x1, x2) + 'px',
								height: '14px',
								pointerEvents: 'none',
							}}
						/>
					);
				}
			}
			const poison = pl.status.get('poison'),
				poisoninfo =
					(poison > 0 ? poison + ' 1:2' : poison < 0 ? -poison + ' 1:7' : '') +
					(pl.status.get('neuro') ? ' 1:10' : '');
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
		if (floodvisible) children.push(floodsvg);

		children.push(
			<div
				style={{
					whiteSpace: 'pre-wrap',
					textAlign: 'center',
					position: 'absolute',
					left: '0px',
					top: '40px',
					width: '140px',
				}}>
				{(['Commoner', 'Mage', 'Champion', 'Demigod', 'Arena1', 'Arena2'][
					this.props.game.level
				] || '') +
					'\n' +
					(this.props.game.foename || '-')}
			</div>,
			<span
				style={{
					position: 'absolute',
					left: '762px',
					top: '580px',
					pointerEvents: 'none',
				}}>
				{turntell}
			</span>
		);
		if (self.state.effects) {
			children.push(self.state.effects);
		}
		if (self.state.hovercode) {
			children.push(
				<Components.Card
					x={self.state.hoverx}
					y={self.state.hovery}
					code={self.state.hovercode}
				/>
			);
		}
		if (self.state.tooltip) {
			children.push(
				<Components.Text
					className='infobox'
					text={self.state.tooltip}
					icoprefix='te'
					style={{
						position: 'absolute',
						left: self.state.toolx + 'px',
						top: self.state.tooly + 'px',
					}}
				/>
			);
		}
		children.push(
			<input type='button'
				value={self.state.resigning ? 'Confirm' : 'Resign'}
				onClick={() => self.resignClick()}
				style={{
					position: 'absolute',
					left: '8px',
					top: '20px',
				}}
			/>
		);
		if (!self.props.data.spectate) {
			if (cancelText) {
				children.push(
					<input type='button'
						value={cancelText}
						onClick={() => self.cancelClick()}
						style={{
							position: 'absolute',
							left: '800px',
							top: '560px',
						}}
					/>
				);
			}
			if (endText) {
				children.push(
					<input type='button'
						value={endText}
						onClick={() => self.endClick()}
						style={{
							position: 'absolute',
							left: '800px',
							top: '530px',
						}}
					/>
				);
			}
		}

		return children;
	}
});
