export default function Text(props) {
	const elec = () => {
		const str = props.text ? props.text.toString() : '';
		const sep = /\d\d?:\d\d?|\$|\n/g;
		const ico = `ico ${props.icoprefix ?? 'ce'}`;
		let reres,
			lastindex = 0;
		const elec = [];
		while ((reres = sep.exec(str))) {
			const piece = reres[0];
			if (reres.index !== lastindex) {
				elec.push(str.slice(lastindex, reres.index));
			}
			if (piece === '\n') {
				elec.push(<br />);
			} else if (piece === '$') {
				elec.push(<span class="ico gold" />);
			} else if (/^\d\d?:\d\d?$/.test(piece)) {
				const parse = piece.split(':');
				const num = +parse[0];
				const className = ico + parse[1];
				if (num === 0) {
					elec.push('0');
				} else if (num < 4) {
					for (let j = 0; j < num; j++) {
						elec.push(<span class={className} />);
					}
				} else {
					elec.push(parse[0], <span class={className} />);
				}
			}
			lastindex = reres.index + piece.length;
		}
		if (lastindex !== str.length) {
			elec.push(str.slice(lastindex));
		}
		return elec;
	};

	return (
		<div class={props.class} style={props.style}>
			{elec}
		</div>
	);
}
