module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		concat: {
			options: {
				stripBanners: {all: true},
			},
			dist: {
				src: ["MersenneTwister.js", "classes.js", "actives.js", "etg.js", "pixi.js"],
				dest: "js.js",
			}
		}
	});
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.registerTask("default", ["concat"]);
}