const sounds = new Map(),
	musics = new Map();
let currentMusic,
	soundEnabled = false,
	musicEnabled = false;

export const musicList = [
	[0, null, 'Silence'],
	[1, 'openingMusic', "Timpa's Piano"],
	[2, 'avesElemental', "Aves' Elemental"],
];

export function playSound(name, mayreset = false) {
	if (soundEnabled) {
		let sound = sounds.get(name);
		if (!sound) {
			sound = new Audio(`sound/${name}.opus`);
			sounds.set(name, sound);
		}
		if (mayreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
}
export function playMusic(name) {
	if (name === currentMusic) return;
	let music;
	if (musicEnabled && (music = musics.get(currentMusic))) music.pause();
	currentMusic = name;
	if (musicEnabled && currentMusic) {
		music = musics.get(name);
		if (!music) {
			music = new Audio(`sound/${name}.opus`);
			musics.set(name, music);
			music.loop = true;
		}
		music.play().catch(() => {
			if (currentMusic === name) {
				currentMusic = null;
			}
		});
	}
}
export function changeSound(enabled) {
	soundEnabled = enabled;
	if (!soundEnabled) {
		for (const sound of sounds.values()) {
			sound.pause();
		}
	}
}
export function changeMusic(enabled) {
	musicEnabled = enabled;
	if (!musicEnabled) {
		if (currentMusic) {
			const music = musics.get(currentMusic);
			if (music) music.pause();
		}
	} else {
		const name = currentMusic ?? 'openingMusic';
		currentMusic = null;
		playMusic(name);
	}
}
