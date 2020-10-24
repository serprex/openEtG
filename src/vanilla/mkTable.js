export default function mkTable(data) {
	const tbl = document.createElement('table');
	for (const rowdata of data) {
		const row = document.createElement('tr');
		for (const coldata of rowdata) {
			const col = document.createElement('td');
			col.textContent = coldata;
			row.appendChild(col);
		}
		tbl.appendChild(row);
	}
	return tbl;
}
