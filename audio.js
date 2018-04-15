const Effect = require('./Effect'),
	sounds = {},
	musics = {};
let currentMusic,
	soundEnabled = false,
	musicEnabled = false;
exports.playSound = function(name, dontreset) {
	if (soundEnabled && !Effect.disable) {
		let sound = sounds[name];
		if (!sound) {
			sound = sounds[name] = new Audio('sound/' + name + '.ogg');
		}
		if (!dontreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
};
exports.playMusic = function(name) {
	if (name == currentMusic || Effect.disable) return;
	let music;
	if (musicEnabled && (music = musics[currentMusic])) music.pause();
	currentMusic = name;
	if (musicEnabled) {
		music = musics[name];
		if (!music) {
			music = musics[name] = new Audio('sound/' + name + '.ogg');
			music.loop = true;
		}
		music.play();
	}
};
exports.changeSound = function(enabled) {
	soundEnabled = enabled;
	if (!soundEnabled) {
		for (const sound in sounds) {
			sounds[sound].pause();
		}
	}
};
exports.changeMusic = function(enabled) {
	musicEnabled = enabled;
	if (!musicEnabled) {
		const music = musics[currentMusic];
		if (music) music.pause();
	} else {
		const name = currentMusic;
		currentMusic = null;
		exports.playMusic(name);
	}
};
