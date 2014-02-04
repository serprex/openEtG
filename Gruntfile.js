module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		concat: {
			options: {
				stripBanners: true,
			},
			dist: {
				src: ["etg.client.js", "classes.js", "actives.js", "animations.js", "ai.targeting.js", "ai.eval.js", "etg.js"],
				dest: "js.js",
			}
		}
	});
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.registerTask("default", ["concat"]);
}