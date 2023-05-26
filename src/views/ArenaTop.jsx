import { useEffect, useState } from 'react';

import Cards from '../Cards.js';
import * as Components from '../Components/index.jsx';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';

export default function ArenaTop({ lv }) {
	const [top, setTop] = useState([]);
	const [card, setCard] = useState(null);

	useEffect(() => {
		store.store.dispatch(store.setCmds({ arenatop: ({ top }) => setTop(top) }));
		sock.emit({ x: 'arenatop', lv });
	}, []);

	return (
		<>
			<ol
				className="atopol"
				style={{
					position: 'absolute',
					left: '90px',
					top: '16px',
				}}>
				{top.map((data, i) => {
					const card = Cards.Codes[data[5]].asUpped(lv);
					return (
						<li key={i}>
							<span className="atoptext">{data[0]}</span>
							<span className="atop1">{data[1]}</span>
							<span className="atop2">{data[2]}</span>
							<span className="atopdash">-</span>
							<span className="atop3">{data[3]}</span>
							<span className="atop4">{data[4]}</span>
							<span
								className="atoptext"
								onMouseEnter={e =>
									setCard(
										<Components.Card
											card={card}
											x={e.pageX + 4}
											y={e.pageY + 4}
										/>,
									)
								}
								onMouseLeave={() => setCard(null)}>
								{card.name}
							</span>
						</li>
					);
				})}
			</ol>
			<Components.ExitBtn x={8} y={300} />
			{card}
		</>
	);
}