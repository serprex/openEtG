var fs = require("fs");
var etgutil = require("../etgutil");
function cardRedirect(req, res, next){
	var code = req.url.substr(1, 3);
	if (code >= "6qo"){
		fs.exists(req.url, function(exists){
			if (!exists){
				res.writeHead(302, {Location: "http://" + req.headers.host + "/Cards/" + etgutil[code >= "g00"?"asShiny":"asUpped"](code, false) + ".png"});
				res.end();
			}else next();
		});
	}else next();
}
module.exports = function(){
	return cardRedirect;
}