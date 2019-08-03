import atlas from '../../assets/atlas.json';
const aname = document.getElementById('aname');
const a2n = {
	e: 'Timpa & Ravi',
	e13: 'Kae',
	e14: 'Fippe',
	r: 'Timpa',
	t: 'Ravi',
	s: 'Kae',
	cback: 'Kae',
	sborder: 'Kae',
	silence: 'Kae',
	sabbath: 'Kae',
	sanctuary: 'Kae',
	sacrifice: 'Kae',
	protection: 'Kae',
	singularity: 'Kae',
	gold: 'Kae',
};
let oldkey;
document.getElementById('codeimg').addEventListener('mousemove', function(e) {
	const x = e.pageX - this.offsetLeft,
		y = e.pageY - this.offsetTop;
	for (const key in atlas) {
		const v = atlas[key];
		if (x >= v[0] && x <= v[0] + v[2] && y >= v[1] && y <= v[1] + v[3]) {
			if (oldkey == key) return;
			oldkey = key;
			while (aname.firstChild) aname.firstChild.remove();
			aname.appendChild(
				document.createTextNode(a2n[key] || a2n[key.replace(/\d+$/, '')]),
			);
			return;
		}
	}
});
