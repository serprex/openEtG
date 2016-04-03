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
	if (tabBox != tabMap.Main[0]){
		addSpan(span.cloneNode(true), "Main")
	}
	span.appendChild(document.createElement("br"));
	if (tabBox == chatBox){
		var scroll = Math.abs(chatBox.scrollTop - chatBox.scrollHeight + chatBox.offsetHeight) < 2;
		chatBox.appendChild(span);
		if (scroll) chatBox.scrollTop = chatBox.scrollHeight;
	}else{
		tabBox.appendChild(span);
		tab[1].style.fontWeight = "bold";
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
	tabBox.id = "chatBox";
	tabMap[name] = [tabBox, span];
	span.className = "tab";
	span.appendChild(document.createTextNode(name));
	span.addEventListener("click", function(){
		this.style.fontWeight = "";
		if (chatBox != tabBox){
			chatBox.parentElement.insertBefore(tabBox, chatBox);
			chatBox.remove();
			chatBox = tabBox;
		}
		chatBox.scrollTop = chatBox.scrollHeight;
	});
	tabs.appendChild(document.createTextNode(" "));
	tabs.appendChild(span);
}
chat.addTab("Main", chatBox);
chat.addTab("System");
chat.addTab("Stats");
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
