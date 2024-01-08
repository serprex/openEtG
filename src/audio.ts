const sounds = new Map<string, HTMLAudioElement>(),
	musics = new Map<string, HTMLAudioElement>();
let currentMusic: string,
	soundEnabled = false,
	musicEnabled = false;
export function playSound(name: string, mayreset = false) {
	if (soundEnabled) {
		let sound = sounds.get(name);
		if (!sound) {
			sound = new Audio(`sound/${name}.ogg`);
			sounds.set(name, sound);
		}
		if (mayreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
}
export function playMusic(name: string) {
	if (name === currentMusic) return;
	let music: HTMLAudioElement;
	if (musicEnabled && (music = musics.get(currentMusic))) music.pause();
	currentMusic = name;
	if (musicEnabled) {
		music = musics.get(name);
		if (!music) {
			music = new Audio(`sound/${name}.ogg`);
			musics.set(name, music);
			music.loop = true;
		}
		music.play();
	}
}
export function changeSound(enabled: boolean) {
	soundEnabled = enabled;
	if (!soundEnabled) {
		for (const sound of sounds.values()) {
			sound.pause();
		}
	}
}
export function changeMusic(enabled: boolean) {
	musicEnabled = enabled;
	if (!musicEnabled) {
		const music = musics.get(currentMusic);
		if (music) music.pause();
	} else {
		const name = currentMusic;
		currentMusic = null;
		playMusic(name);
	}
}
