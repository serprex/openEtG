import { createSignal, onMount, Show } from 'solid-js';

import { emit, setCmds } from '../sock.jsx';
import { chatMsg, doNav, setUser } from '../store.jsx';
const MainMenu = import('./MainMenu.jsx');

export default function KongLogin() {
	const [guest, setGuest] = createSignal(false);

	onMount(() => {
		kongregateAPI.loadAPI(() => {
			const kong = kongregateAPI.getAPI();
			if (kong.services.isGuest()) {
				setGuest(true);
			} else {
				setCmds({
					login: data => {
						if (!data.err) {
							setUser(data.name, data.auth, data.data);
							if (!data.data['']) {
								doNav(import('./ElementSelect.jsx'));
							} else {
								doNav(MainMenu);
							}
						} else {
							chatMsg(data.err);
							alert(data.err);
						}
					},
				});
				emit({
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
