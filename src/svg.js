import * as ui from './ui.js';
import * as Cards from './Cards.js';
import * as etgutil from './etgutil.js';
const cssPrefix = "<style type='text/css'><![CDATA[text{font:12px sans-serif}",
	svgPrefix = "<svg xmlns='http://www.w3.org/2000/svg'";
function eleChar(card) {
	return String.fromCharCode(97 + card.element + (card.upped ? 13 : 0));
}
export function card(code) {
	const card = Cards.Codes[code],
		textColor = card.upped ? '' : " fill='#fff'";
	return (
		`<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='256' width='128'>${cssPrefix}]]></style><image xlink:href='../assets/cardBacks.png' x='${(card.element +
			card.upped * 13) *
			-128}
		' width='3328' height='127'/>` +
		`<image xlink:href='../assets/cardBacks.png' x='${(card.element +
			card.upped * 13) *
			-128}
		' y='128' width='3328' height='127'/>` +
		`<text x='2' y='15'${textColor}>${card.name}</text>` +
		`<rect x='0' y='20' width='128' height='128' fill='${ui.maybeLightenStr(
			card,
		)}'/><foreignObject width='128' height='256'><p xmlns='http://www.w3.org/1999/xhtml' style='font:10px sans-serif;white-space:pre-wrap${
			textColor ? '' : ';color:#000'
		};position:absolute;left:2px;top:150px;right:2px;height:106px;margin:0'>` +
		`<img ${
			card.code & 0x4000 ? "class='shiny' " : ''
		}src='/Cards/${card.code.toString(
			32,
		)}.png' style='position:absolute;top:-130px;left:-2px'/>${card
			.info()
			.replace(/\|/g, ' / ')
			.replace(/(\d\d?):(\d\d?) ?/g, (m, n, e) => {
				switch (n | 0) {
					case 0:
						return '0';
					case 1:
						return `<span class='ico te${e}'></span>`;
					case 2:
						return `<span class='ico te${e}'></span><span class='ico te${e}'></span>`;
					case 3:
						return `<span class='ico te${e}'></span><span class='ico te${e}'></span><span class='ico te${e}'></span>`;
					default:
						return `${n}<span class='ico te${e}'></span>`;
				}
			})}${
			card.rarity
				? `<span class='ico r${card.rarity}' style='position:absolute;right:30px;bottom:2px'></span>`
				: ''
		}${
			card.cost
				? `<span style='position:absolute;right:2px;top:-150px'>
			  ${card.cost}
			  ${
					card.element !== card.costele
						? `<span class='ico ce${card.costele}'></span>`
						: ''
				}</span>`
				: ''
		}<span class='ico t${
			card.type
		}' style='position:absolute;right:2px;bottom:2px'></span></p></foreignObject></svg>`
	);
}
export function deck(deck) {
	function classString() {
		let ret = '';
		for (const cls in classes) {
			ret += `.${cls}{${classes[cls]}}`;
		}
		return ret;
	}
	let texts = new Map(),
		textml = '',
		textrl = '',
		x = 16,
		y = 0,
		classes = {},
		mark,
		suffix;
	for (const code of etgutil.iterdeck(deck)) {
		if (!(code in Cards.Codes)) {
			const ismark = etgutil.fromTrueMark(code);
			if (~ismark) mark = ismark;
			continue;
		}
		const card = Cards.Codes[code],
			elech = eleChar(card),
			elecls = `${card.shiny ? 'A' : 'B'} ${elech}`;
		if (card.shiny) classes.A = 'stroke:#da2;stroke-width:.5';
		else classes.B = 'stroke:#000;stroke-width:.5';
		classes[elech] = `fill:${ui.maybeLightenStr(card)}`;
		const textColor = card.upped ? '' : " fill='#fff'";
		let textId = texts.get(card.code);
		if (!textId) {
			textId = `N${texts.size}`;
			texts.set(card.code, textId);
			textml += `<symbol id='${textId}' width='100' height='16' viewBox='0 0 100 16'><path d='M0 0H100V16H0' class='${elecls}'/><text clip-path='polygon(0 0, 96px 0,96px 14px,0 14px)' x='2' y='13'${textColor}>${card.name}</text></symbol>`;
		}
		textrl += `<use href='#${textId}' x='${x}' y='${y}'/>`;
		y += 16;
		if (y == 160) {
			y = 0;
			x += 100;
		}
	}
	if (mark !== undefined) {
		const cls = String.fromCharCode(97 + mark);
		classes[cls] = `fill:${ui.strcols[mark]}`;
		suffix = `<path class='${cls}' d='M0 0h16v160H0'/><text x='5' y='-4' transform='rotate(90)' ${
			~[0, 8, 10, 12].indexOf(mark) ? '' : " fill='#fff'"
		}>${ui.eleNames[mark]}</text></svg>`;
	} else suffix = '</svg>';
	return `${svgPrefix} height='160' width='${
		y ? x + 100 : x
	}'>${cssPrefix}${classString()}]]></style><defs>${textml}</defs>${textrl}${suffix}`;
}
