'use strict';
const ui = require('../ui'),
	etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Card = require('../Card'),
	Game = require('../Game'),
	Cards = require('../Cards'),
	Effect = require('../Effect'),
	Skills = require('../Skills'),
	etgutil = require('../etgutil'),
	aiSearch = require('../ai/search'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

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

function ThingInst(props) {
	const obj = props.obj,
		game = props.game,
		scale =
			obj.type === etg.Weapon || obj.type === etg.Shield
				? 1.2
				: obj.type == etg.Spell ? 0.85 : 1,
		isSpell = obj.type === etg.Spell;
	const children = [
		h('img', {
			className: obj.card.shiny ? 'shiny' : undefined,
			src: '/Cards/' + obj.card.code.toString(32) + '.png',
			style: {
				position: 'absolute',
				left: '0',
				top: isSpell ? '0' : '10px',
				width: 64 * scale + 'px',
				height: 64 * scale + 'px',
				backgroundColor: ui.maybeLightenStr(obj.card),
				pointerEvents: 'none',
			},
		}),
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
				h('div', {
					className: 'ico s' + k,
					style: {
						position: 'absolute',
						top: 64 * scale + 10 + 'px',
						left: [32, 8, 8, 0, 24, 16, 8][k] + 'px',
						opacity: '.6',
					},
				}),
			);
		}
	}
	for (let k = 0; k < 3; k++) {
		if (!isSpell && bordervisible[k]) {
			children.push(
				h('div', {
					className: 'ico sborder' + k,
					style: {
						position: 'absolute',
						left: '0',
						top: '0',
						transform: scale === 1 ? undefined : 'scale(' + scale + ')',
					},
				}),
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
					width: 72 * scale + 'px',
					height: '11px',
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
					position: 'absolute',
					top: isSpell ? '0' : '10px',
					right: '0',
					height: '11px',
					backgroundColor: ui.maybeLightenStr(obj.card),
				}}
			/>
		);
	}
	if (obj.hasactive('prespell', 'protectonce')) {
		children.push(
			<div
				className='ico protection'
				style={{
					position: 'absolute',
					left: '0',
					top: '0',
				}}
			/>
		);
	}
	const pos = ui.tgtToPos(obj);
	return h('div', {
		children: children,
		className: tgtclass(game, obj),
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
		},
		onMouseOver: props.setInfo && (e => props.setInfo(e, obj, pos.x)),
		onMouseOut: props.onMouseOut,
		onClick: function() {
			if (game.phase != etg.PlayPhase) return;
			if (obj.type !== etg.Spell) {
				if (game.targeting && game.targeting.filter(obj)) {
					game.targeting.cb(obj);
					props.setGame(game);
				} else if (
					obj.owner == game.player1 &&
					!game.targeting &&
					obj.canactive()
				) {
					game.getTarget(obj, obj.active.cast, tgt => {
						if (!game.ai)
							sock.emit('cast', {
								bits: game.tgtToBits(obj) | (game.tgtToBits(tgt) << 9),
							});
						obj.useactive(tgt);
						props.setGame(game);
					});
					props.setGame(game);
				}
			} else {
				if (obj.owner == game.player1 && props.discarding) {
					props.funcEnd(obj.getIndex());
				} else if (game.targeting) {
					if (game.targeting.filter(obj)) {
						game.targeting.cb(obj);
						props.setGame(game);
					}
				} else if (obj.owner == game.player1 && obj.canactive()) {
					if (obj.card.type != etg.Spell) {
						if (!game.ai) sock.emit('cast', { bits: game.tgtToBits(obj) });
						obj.useactive();
						props.setGame(game);
					} else {
						game.getTarget(obj, obj.card.active.cast, tgt => {
							if (!game.ai)
								sock.emit('cast', {
									bits: game.tgtToBits(obj) | (game.tgtToBits(tgt) << 9),
								});
							obj.useactive(tgt);
							props.setGame(game);
						});
						props.setGame(game);
					}
				}
			}
		},
	});
}

function addNoHealData(game) {
	const data = game.dataNext || {};
	if (game.noheal) {
		data.p1hp = Math.max(game.player1.hp, 1);
		data.p1maxhp = game.player1.maxhp;
	}
	return data;
}

function startMatch(self, game, gameData) {
	function drawTgting(spr, col) {
		fgfx.drawRect(
			spr.position.x - spr.width / 2,
			spr.position.y - spr.height / 2,
			spr.width,
			spr.height,
		);
	}
	function drawBorder(obj, spr) {
		if (obj) {
			if (game.targeting) {
				if (game.targeting.filter(obj)) {
					fgfx.lineStyle(2, 0xff0000);
					drawTgting(spr, 0xff0000);
					fgfx.lineStyle(2, 0xffffff);
				}
			} else if (
				obj.canactive() &&
				!(obj.owner == game.player2 && game.player2.isCloaked())
			) {
				fgfx.lineStyle(2, obj.card.element == 8 ? 0 : 0xffffff);
				fgfx.drawRect(
					spr.position.x - spr.width / 2,
					spr.position.y - spr.height / 2 - 1,
					spr.width,
					obj.type == etg.Weapon || obj.type == etg.Shield ? 12 : 10,
				);
			}
		}
	}
	function endClick(discard) {
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
			store.store.dispatch(store.doNav(require('./Result'), { game: game, data: gameData }));
		} else if (game.turn == game.player1) {
			if (discard == undefined && game.player1.hand.length == 8) {
				self.setState({ discarding: true });
			} else {
				self.setState({ discarding: false });
				if (!game.ai) sock.emit('endturn', { bits: discard });
				game.player1.endturn(discard);
				game.targeting = null;
				self.setState({ foeplays: [], game: game });
			}
		}
	}
	function cancelClick() {
		if (self.state.resigning) {
			self.setState({ resigning: false });
		} else if (game.turn == game.player1) {
			if (game.phase === etg.MulliganPhase && game.player1.hand.length) {
				game.player1.drawhand(game.player1.hand.length - 1);
				if (!game.ai) sock.emit('mulligan');
				self.setState({ game: game });
			} else if (game.targeting) {
				game.targeting = null;
				self.setState({ game: game });
			} else self.setState({ discarding: false });
		}
	}
	function resignClick() {
		if (self.state.resigning) {
			if (!game.ai) sock.emit('foeleft');
			game.setWinner(game.player2);
			endClick();
		} else {
			self.setState({ resigning: true });
		}
	}
	var aiDelay = 0,
		aiState,
		aiCommand;
	if (sock.user && !game.endurance && (game.level !== undefined || !game.ai)) {
		sock.user.streakback = sock.user.streak[game.level];
		sock.userExec('addloss', { pvp: !game.ai, l: game.level, g: -game.cost });
	}
	const playerClick = [];
	for (let j = 0; j < 2; j++) {
		playerClick[j] = function() {
			if (
				game.phase == etg.PlayPhase &&
				game.targeting &&
				game.targeting.filter(game.players(j))
			) {
				game.targeting.cb(game.players(j));
				self.setState({ game: game });
			}
		};
	}
	self.setState({
		funcEnd: endClick,
		funcCancel: cancelClick,
		funcResign: resignClick,
		playerClick: playerClick,
	});
	Effect.clear();
	function onkeydown(e) {
		if (e.target.id == 'chatinput') return;
		const kc = e.which || e.keyCode,
			ch = String.fromCharCode(kc);
		let chi;
		if (kc == 27) {
			resignClick();
		} else if (ch == ' ' || kc == 13) {
			endClick();
		} else if (ch == '\b' || ch == '0') {
			cancelClick();
		} else if (~(chi = 'SW'.indexOf(ch))) {
			playerClick[chi]();
		} /* else if (~(chi = "QA".indexOf(ch))) {
			shiesprite[chi].click();
		} else if (~(chi = "ED".indexOf(ch))) {
			weapsprite[chi].click();
		} else if (~(chi = "12345678".indexOf(ch))) {
			handsprite[0][chi].click();
		} */ else
			return;
		e.preventDefault();
	}
	const cmds = {
		endturn: function(data) {
			(data.spectate == 1 ? game.player1 : game.player2).endturn(data.bits);
			if (data.spectate) self.setState({ foeplays: [] });
			self.setState({ game: game });
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
			self.setState({ game: game });
		},
		foeleft: function(data) {
			if (!game.ai)
				game.setWinner(data.spectate == 1 ? game.player2 : game.player1);
			self.setState({ game: game });
		},
		mulligan: function(data) {
			if (data.draw === true) {
				game.progressMulligan();
			} else {
				const pl = data.spectate == 1 ? game.player1 : game.player2;
				pl.drawhand(pl.hand.length - 1);
			}
			self.setState({ game: game });
		},
	};
	if (!gameData.spectate) {
		document.addEventListener('keydown', onkeydown);
	}
	function gameStep() {
		if (game.turn == game.player2 && game.ai) {
			if (game.phase == etg.PlayPhase) {
				if (!aiCommand) {
					Effect.disable = true;
					if (aiState) {
						aiState.step(game);
					} else {
						aiState = new aiSearch(game);
					}
					Effect.disable = false;
					if (aiState.cmd) {
						aiCommand = true;
					}
				}
				var now;
				if (aiCommand && (now = Date.now()) > aiDelay) {
					cmds[aiState.cmd]({ bits: aiState.cmdct });
					aiState = undefined;
					aiCommand = false;
					aiDelay = now + (game.turn == game.player1 ? 2000 : 200);
				}
			} else if (game.phase === etg.MulliganPhase) {
				cmds.mulligan({ draw: require('../ai/mulligan')(game.player2) });
			}
		}
		const effects = Effect.next(self.state.cloaked);
		if (effects !== self.state.effects) {
			self.setState({ effects });
		}
	}
	gameStep();
	const gameInterval = setInterval(gameStep, 30);
	self.setState({
		endnext: function() {
			document.removeEventListener('keydown', onkeydown);
			clearInterval(gameInterval);
		},
	});
	store.store.dispatch(store.setCmds(cmds));
}

function tgtclass(game, obj) {
	if (game.targeting) {
		if (game.targeting.filter(obj)) return 'ants-red';
	} else if (obj.owner === game.player1 && obj.canactive()) return 'ants-black';
}

module.exports = class Match extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			tooltip: '',
			foeplays: [],
			discarding: false,
			resigning: false,
			effects: null,
			playerClick: [],
		};
	}

	componentDidMount() {
		if (sock.trade) {
			sock.userEmit('canceltrade');
			delete sock.trade;
		}
		startMatch(this, this.props.game, this.props.data);
	}

	componentWillUnmount() {
		if (this.state.endnext) {
			this.state.endnext();
		}
		store.store.dispatch(store.setCmds({}));
	}

	componentWillReceiveProps(props) {
		this.componentWillUnmount();
		startMatch(this, props.game, props.data);
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
			children = [svgbg];
		const game = this.props.game;
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
					h(Components.CardImage, {
						key: 'foeplay' + i,
						x: (i & 7) * 99,
						y: (i >> 3) * 19,
						card: play,
						onMouseOver: function(e) {
							if (play instanceof Card) {
								self.setCard(e, play, e.pageX);
							}
						},
						onMouseOut: function() {
							self.clearCard();
						},
					}),
				);
			}
		}
		let floodvisible = false;
		for (let j = 0; j < 2; j++) {
			const pl = game.players(j);

			const plpos = ui.tgtToPos(pl);
			children.push(
				h('div', {
					className: tgtclass(game, pl),
					style: {
						position: 'absolute',
						left: plpos.x - 48 + 'px',
						top: plpos.y - 40 + 'px',
						width: '96px',
						height: '80px',
						border: 'transparent 2px solid',
					},
					onClick: self.state.playerClick[j],
					onMouseOver: function(e) {
						self.setInfo(e, pl);
					},
				}),
			);
			children.push(
				h(
					'span',
					{
						className: 'ico e' + pl.mark,
						style: {
							position: 'absolute',
							left: j ? '160px' : '740px',
							top: j ? '130px' : '470px',
							transform: 'translate(-50%,-50%)',
							textAlign: 'center',
							pointerEvents: 'none',
							fontSize: '18px',
							textShadow: '2px 2px 1px #000,2px 2px 2px #000',
						},
					},
					pl.markpower !== 1 && pl.markpower,
				),
			);
			if (pl.sosa) {
				children.push(
					h('div', {
						className: 'ico sacrifice',
						style: {
							position: 'absolute',
							left: j ? '800px' : '0',
							top: j ? '7px' : '502px',
						},
					}),
				);
			}
			if (pl.flatline) {
				children.push(
					h('span', {
						className: 'ico sabbath',
						style: {
							position: 'absolute',
							left: j ? '792px' : '0',
							top: j ? '80px' : '288px',
						},
					}),
				);
			}
			let handOverlay = pl.usedactive
				? 'ico silence'
				: pl.sanctuary
					? 'ico sanctuary'
					: pl.nova >= 3 && pl.hand.some(c => c.card.isOf(Cards.Nova))
						? 'ico singularity'
						: '';
			if (handOverlay) {
				children.push(
					h('span', {
						className: handOverlay,
						style: {
							position: 'absolute',
							left: j ? '3px' : '759px',
							top: j ? '75px' : '305px',
						},
					}),
				);
			}
			for (let i = 0; i < pl.hand.length; i++) {
				const isfront = j == 0 || game.player1.precognition,
					card = pl.hand[i];
				if (isfront) {
					children.push(
						h(ThingInst, {
							obj: card,
							game: game,
							setGame: function(g) {
								self.setState({ game: g });
							},
							discarding: self.state.discarding,
							funcEnd: self.state.funcEnd,
							setInfo: function(e, obj, x) {
								return self.setCard(e, obj.card, x);
							},
							onMouseOut: function() {
								self.clearCard();
							},
						}),
					);
				} else if (card) {
					const pos = ui.cardPos(j, i);
					children.push(
						h(
							'div',
							{
								className: tgtclass(game, card),
								style: {
									position: 'absolute',
									left: pos.x - 32 + 'px',
									top: pos.y - 38 + 'px',
									width: '68px',
									height: '80px',
									border: 'transparent 2px solid',
								},
							},
							h('div', {
								className: 'ico cback',
								style: {
									left: '2px',
									top: '2px',
								},
							}),
						),
					);
				}
			}
			const creatures = [], perms = [];
			for (let i = 0; i < 23; i++) {
				const cr = pl.creatures[i];
				if (cr && !(j == 1 && cloaked)) {
					creatures.push(
						h(ThingInst, {
							key: i,
							obj: cr,
							game: game,
							setGame: function(g) {
								self.setState({ game: g });
							},
							setInfo: function(e, obj, x) {
								return self.setInfo(e, obj, x);
							},
							onMouseOut: function() {
								self.clearCard();
							},
						}),
					);
				}
			}
			for (let i = 0; i < 16; i++) {
				const pr = pl.permanents[i];
				if (pr && pr.status.get('flooding')) floodvisible = true;
				if (pr && !(j == 1 && cloaked && !pr.status.get('cloak'))) {
					perms.push(
						h(ThingInst, {
							key: i,
							obj: pr,
							game: game,
							setGame: function(g) {
								self.setState({ game: g });
							},
							setInfo: function(e, obj, x) {
								return self.setInfo(e, obj, x);
							},
							onMouseOut: function() {
								self.clearCard();
							},
						}),
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
					h(ThingInst, {
						obj: wp,
						game: game,
						setGame: function(g) {
							self.setState({ game: g });
						},
						setInfo: function(e, obj, x) {
							return self.setInfo(e, obj, x);
						},
						onMouseOut: function() {
							self.clearCard();
						},
					}),
				);
			}
			const sh = pl.shield;
			if (sh && !(j == 1 && cloaked)) {
				children.push(
					h(ThingInst, {
						obj: sh,
						game: game,
						setGame: function(g) {
							self.setState({ game: g });
						},
						setInfo: function(e, obj, x) {
							return self.setInfo(e, obj, x);
						},
						onMouseOut: function() {
							self.clearCard();
						},
					}),
				);
			}
			const qx = j ? 792 : 0,
				qy = j ? 106 : 308;
			for (let k = 1; k < 13; k++) {
				children.push(
					h('span', {
						className: 'ico e' + k,
						style: {
							position: 'absolute',
							left: qx + (k & 1 ? 0 : 54) + 'px',
							top: qy + Math.floor((k - 1) / 2) * 32 + 'px',
						},
					}),
					h(
						'span',
						{
							style: {
								position: 'absolute',
								left: qx + (k & 1 ? 32 : 86) + 'px',
								top: qy + Math.floor((k - 1) / 2) * 32 + 4 + 'px',
								fontSize: '16px',
								pointerEvents: 'none',
							},
						},
						pl.quanta[k] || '',
					),
				);
			}
			children.push(
				h('div', {
					style: {
						backgroundColor: '#000',
						position: 'absolute',
						left: plpos.x - 41 + 'px',
						top: j ? '36px' : '531px',
						width: '82px',
						height: '16px',
					},
				}),
			);
			if (pl.hp > 0) {
				children.push(
					h('div', {
						style: {
							backgroundColor: ui.strcols[etg.Life],
							position: 'absolute',
							left: plpos.x - 40 + 'px',
							top: j ? '37px' : '532px',
							width: 80 * pl.hp / pl.maxhp + 'px',
							height: '14px',
						},
					}),
				);
				if (!cloaked && game.expectedDamage[j]) {
					const x1 = 80 * pl.hp / pl.maxhp;
					const x2 =
						x1 - 80 * Math.min(game.expectedDamage[j], pl.hp) / pl.maxhp;
					children.push(
						h('div', {
							style: {
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
							},
						}),
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
				h(Components.Text, {
					text: hptext,
					style: {
						textAlign: 'center',
						width: '100px',
						pointerEvents: 'none',
						fontSize: '12px',
						lineHeight: '1.1',
						position: 'absolute',
						left: j ? '800px' : '0px',
						top: j ? '36px' : '531px',
					},
				}),
			);
		}
		if (floodvisible) children.push(floodsvg);

		children.push(
			h(
				'div',
				{
					style: {
						whiteSpace: 'pre-wrap',
						textAlign: 'center',
						position: 'absolute',
						left: '0px',
						top: '40px',
						width: '140px',
					},
				},
				(['Commoner', 'Mage', 'Champion', 'Demigod', 'Arena1', 'Arena2'][
					this.props.game.level
				] || '') +
					'\n' +
					(this.props.game.foename || '-'),
			),
		);
		children.push(
			h(
				'span',
				{
					style: {
						position: 'absolute',
						left: '762px',
						top: '580px',
						pointerEvents: 'none',
					},
				},
				turntell,
			),
		);
		if (self.state.effects) {
			Array.prototype.push.apply(children, self.state.effects);
		}
		if (self.state.hovercode) {
			children.push(
				h(Components.Card, {
					x: self.state.hoverx,
					y: self.state.hovery,
					code: self.state.hovercode,
				}),
			);
		}
		if (self.state.tooltip) {
			children.push(
				h(Components.Text, {
					className: 'infobox',
					text: self.state.tooltip,
					icoprefix: 'te',
					style: {
						position: 'absolute',
						left: self.state.toolx + 'px',
						top: self.state.tooly + 'px',
					},
				}),
			);
		}
		children.push(
			h('input', {
				type: 'button',
				value: self.state.resigning ? 'Confirm' : 'Resign',
				onClick: function() {
					self.state.funcResign();
				},
				style: {
					position: 'absolute',
					left: '8px',
					top: '20px',
				},
			}),
		);
		if (!self.props.data.spectate) {
			if (cancelText) {
				children.push(
					h('input', {
						type: 'button',
						value: cancelText,
						onClick: function() {
							self.state.funcCancel();
						},
						style: {
							position: 'absolute',
							left: '800px',
							top: '560px',
						},
					}),
				);
			}
			if (endText) {
				children.push(
					h('input', {
						type: 'button',
						value: endText,
						onClick: function() {
							self.state.funcEnd();
						},
						style: {
							position: 'absolute',
							left: '800px',
							top: '530px',
						},
					}),
				);
			}
		}

		return h(React.Fragment, null, ...children);
	}
};
