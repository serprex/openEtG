import mkTable from '../mkTable.js';

const infobox = document.getElementById('infobox'),
	dmginput = document.getElementById('dmginput');
function updateTable(e) {
	while (infobox.firstChild) infobox.firstChild.remove();
	const dmg = [],
		dmgtext = dmginput.value.split(' ').map(x => x.trim());
	for (const dt of dmgtext) {
		if (!dt) {
			continue;
		} else if (~dt.indexOf('x')) {
			const dts = dt.split('x'),
				d = +dts[0],
				n = +dts[1];
			for (const j = 0; j < n; j++) {
				dmg.push(d);
			}
		} else {
			dmg.push(+dt);
		}
	}
	let dmgmap = new Map([[0, [100, 100]]]);
	for (const dmgi of dmg) {
		const nextdmg = new Map();
		for (const [d, [dp, fp]] of dmgmap) {
			const hitd = d + dmgi,
				dval = nextdmg.get(d) || [0, 0],
				hitdval = nextdmg.get(hitd) || [0, 0];
			dval[0] += dp / 2;
			hitdval[0] += dp / 2;
			dval[1] += fp * 0.4;
			hitdval[1] += fp * 0.6;
			nextdmg.set(d, dval);
			nextdmg.set(hitd, hitdval);
		}
		dmgmap = nextdmg;
	}
	const dmglist = Array.from(dmgmap, ([a, [b, c]]) => [a, b, c]).sort(
		(a, b) => a[0] - b[0],
	);
	for (let i = dmglist.length - 2; i >= 0; i--) {
		dmglist[i][1] += dmglist[i + 1][1];
		dmglist[i][2] += dmglist[i + 1][2];
	}
	for (let i = 0; i < dmglist.length; i++) {
		dmglist[i][1] = dmglist[i][1].toFixed(2);
		dmglist[i][2] = dmglist[i][2].toFixed(2);
	}
	const result = [['Dmg', 'Dusk', 'Fog']].concat(dmglist);
	infobox.appendChild(mkTable(result));
}
dmginput.addEventListener('input', updateTable);
