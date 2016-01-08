var Effect = require("./Effect");
var sounds = {}, musics = {}, currentMusic;
var soundEnabled = false, musicEnabled = false;
exports.loadSounds = function() {
	if (soundEnabled){
		for (var i = 0;i < arguments.length;i++) {
			sounds[arguments[i]] = new Audio("sound/" + arguments[i] + ".ogg");
		}
	}
}
exports.playSound = function(name, dontreset) {
	if (soundEnabled && !Effect.disable) {
		var sound = sounds[name];
		if (!sound){
			sound = sounds[name] = new Audio("sound/" + name + ".ogg");
		}
		if (!dontreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
}
exports.playMusic = function(name) {
	if (name == currentMusic || Effect.disable) return;
	var music;
	if (musicEnabled && (music = musics[currentMusic])) music.pause();
	currentMusic = name;
	if (musicEnabled){
		music = musics[name];
		if (!music){
			music = musics[name] = new Audio("sound/" + name + ".ogg");
			music.loop = true;
		}
		music.play();
	}
}
exports.changeSound = function(enabled) {
	soundEnabled = enabled;
	if (!soundEnabled) {
		for (var sound in sounds) {
			sounds[sound].pause();
		}
	}
}
exports.changeMusic = function(enabled) {
	musicEnabled = enabled;
	if (!musicEnabled) {
		var music = musics[currentMusic];
		if (music) music.pause();
	}else{
		var name = currentMusic;
		currentMusic = null;
		exports.playMusic(name);
	}
}
