"using strict";
var chatBox = document.getElementById("chatBox");
var tabs = document.getElementById("tabs");
function addSpan(span, name) {
	if (name){
		var tab = tabMap[name];
		var tabBox = tab[0];
	}else{
		var tabBox = chatBox;
	}
	if (tabBox != tabMap.Main[0] && tabBox != tabMap.Stats[0] && name != "MainMenu"){
		addSpan(span.cloneNode(true), "Main");
	} else if (tabBox == tabMap.Main[0]) {
		addSpan(span.cloneNode(true), "MainMenu");
	}
	span.appendChild(document.createElement("br"));
	if (tabBox == chatBox){
		var scroll = Math.abs(tabBox.scrollTop - tabBox.scrollHeight + tabBox.offsetHeight) < 2;
		tabBox.appendChild(span);
		if (scroll) tabBox.scrollTop = tabBox.scrollHeight;
	}else{
		tabBox.appendChild(span);
		if (name == "MainMenu"){
			tabBox.scrollTop = tabBox.scrollHeight;
		}else tab[1].style.fontWeight = "bold";
	}
}
function chat(msg, fontcolor, name) {
	var span = document.createElement("span");
	if (fontcolor in tabMap) name = fontcolor;
	else if (fontcolor) span.style.color = fontcolor;
	span.appendChild(document.createTextNode(msg));
	addSpan(span, name);
}
module.exports = chat;
var tabMap = {};
chat.addTab = function(name, div){
	var span = document.createElement("span");
	var tabBox = div || document.createElement("div");
	tabBox.className = "chatBox";
	tabMap[name] = [tabBox, span];
	span.className = "tab";
	span.appendChild(document.createTextNode(name + " "));
	span.addEventListener("click", function(){
		this.style.fontWeight = "";
		if (chatBox != tabBox){
			chatBox.parentElement.insertBefore(tabBox, chatBox);
			chatBox.remove();
			chatBox = tabBox;
		}
		chatBox.scrollTop = chatBox.scrollHeight;
	});
	tabs.appendChild(span);
}
chat.addTab("Main", chatBox);
chat.addTab("System");
chat.addTab("Stats");
chat.addTab("MainMenu");
tabMap.MainMenu[1].style.display = "none";
var menuChat = chat.MainMenuChat = tabMap.MainMenu[0];
menuChat.style.display = "none";
menuChat.style.position = "absolute";
menuChat.style.left = "72px";
menuChat.style.top = "228px";
menuChat.style.width = "224px";
menuChat.style.height = "300px";
menuChat.style.overflow = "hidden";
menuChat.style.background = "transparent";
menuChat.style.fontSize = "14px";
menuChat.style.opacity = "0.6";
document.body.appendChild(menuChat);
chat.addSpan = addSpan;
chat.clear = function(name){
	if (name){
		var tab = tabMap[name];
		var tabBox = tab[0];
	}else{
		var tabBox = chatBox;
	}
	while (tabBox.firstChild) tabBox.firstChild.remove();
}
