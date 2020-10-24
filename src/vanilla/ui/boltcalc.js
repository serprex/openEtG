import mkTable from '../mkTable.js';

const infobox = document.getElementById('infobox'),
	uppedcount = document.getElementById('uppedcount'),
	upped = document.getElementById('upped'),
	quantainput = document.getElementById('quantainput'),
	costs = [3, 1, 2, 1, 3, 1];
uppedcount.textContent = upped.value;
function updateTable() {
	const quanta = +quantainput.value,
		ups = +upped.value;
	const calcs = [
		['Fire'],
		['Water'],
		['Darkness'],
		['Fahrenheit Bonus', Math.floor(quanta / 5)],
	];
	for (let j = 0; j < 3; j++) {
		let q = quanta;
		for (let i = 0; i < 6; i++) {
			const cost = costs[j * 2 + (i < ups)];
			if (q >= costs[j])
				calcs[j].push(
					(j ? 2 : 3) * Math.floor(1 + q / 10) + (i > 0 ? calcs[j][i] : 0),
				);
			else break;
			q -= cost;
		}
	}
	while (infobox.firstChild) infobox.firstChild.remove();
	infobox.appendChild(mkTable(calcs));
}
upped.addEventListener('input', function () {
	uppedcount.textContent = this.value;
	updateTable();
});
quantainput.addEventListener('input', updateTable);
