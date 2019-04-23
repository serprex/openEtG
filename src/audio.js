const Effect = require('./Effect'),
	sounds = new Map(),
	musics = new Map();
let currentMusic,
	soundEnabled = false,
	musicEnabled = false;
exports.playSound = function(name, dontreset) {
	if (soundEnabled && !Effect.disable) {
		let sound = sounds.get(name);
		if (!sound) {
			sound = new Audio(`sound/${name}.ogg`);
			sounds.set(name, sound);
		}
		if (!dontreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
};
exports.playMusic = function(name) {
	if (name == currentMusic || Effect.disable) return;
	let music;
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
};
exports.changeSound = function(enabled) {
	soundEnabled = enabled;
	if (!soundEnabled) {
		for (const sound of sounds.values()) {
			sound.pause();
		}
	}
};
exports.changeMusic = function(enabled) {
	musicEnabled = enabled;
	if (!musicEnabled) {
		const music = musics.get(currentMusic);
		if (music) music.pause();
	} else {
		const name = currentMusic;
		currentMusic = null;
		exports.playMusic(name);
	}
};
