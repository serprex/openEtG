import { useEffect, useState } from 'react';

import { ExitBtn } from '../../Components/index.jsx';
import * as sock from '../../sock.jsx';
import * as store from '../../store.jsx';
import { eleNames } from '../../ui.js';

export default function OriginalLogin(props) {
	const [select, setSelect] = useState(false);

	useEffect(() => {
		store.store.dispatch(
			store.setCmds({
				originaldata: data => {
					if (data.deck) {
						delete data.x;
						store.store.dispatch(store.setOrig(data));
						store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
					} else {
						setSelect(true);
					}
				},
			}),
		);
		sock.userEmit('loginoriginal');
	}, []);

	const mainc = [];
	if (select) {
		for (let i = 1; i <= 13; i++) {
			mainc.push(
				<span
					key={i}
					className={`imgb ico e${i}`}
					style={{
						position: 'absolute',
						left: '12px',
						top: `${24 + (i - 1) * 40}px`,
					}}
					onClick={() => {
						sock.userEmit('initoriginal', {
							e: i === 13 ? (Math.random() * 12 + 1) | 0 : i,
							name: 'Original',
						});
					}}>
					<span
						style={{
							position: 'absolute',
							left: '48px',
							top: '6px',
							width: '144px',
						}}>
						{i === 13 ? 'Random' : eleNames[i]}
					</span>
				</span>,
			);
		}
	}
	return (
		<>
			{!select && 'Loading..'}
			{mainc}
			<ExitBtn x={12} y={570} />
		</>
	);
}