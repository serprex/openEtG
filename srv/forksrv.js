var core = require("child_process").fork("srv/forkcore");
module.exports = function(req, res, next){
	if (req.url.match(/^\/(card|deck|speed)(\/|$)/)){
		core.send(req.url, res.socket);
	}else{
		next();
	}
}