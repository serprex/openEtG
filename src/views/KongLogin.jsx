import { createSignal, onMount, Show } from 'solid-js';

import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
const MainMenu = import('./MainMenu.jsx');

export default function KongLogin() {
	const [guest, setGuest] = createSignal(false);

	onMount(() => {
		kongregateAPI.loadAPI(() => {
			const kong = kongregateAPI.getAPI();
			if (kong.services.isGuest()) {
				setGuest(true);
			} else {
				sock.setCmds({
					login: data => {
						if (!data.err) {
							delete data.x;
							store.setUser(data);
							if (!data.accountbound && !data.pool) {
								store.doNav(import('./ElementSelect.jsx'));
							} else {
								store.doNav(MainMenu);
							}
						} else {
							store.chatMsg(data.err);
							alert(data.err);
						}
					},
				});
				sock.emit({
					x: 'konglogin',
					u: kong.services.getUserId(),
					g: kong.services.getGameAuthToken(),
				});
			}
		});
	});

	return (
		<Show when={guest()} fallback={'Logging in..'}>
			Log in to use Kongregate, or play at{' '}
			<a href="https://etg.dek.im">etg.dek.im</a>
		</Show>
	);
}
