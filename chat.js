"using strict";
var chatBox = document.getElementById("chatBox");
var tabs = document.getElementById("tabs");
function addSpan(span, name) {
	span.appendChild(document.createElement("br"));
	var tabBox = tabMap[name || "Main"];
	if (tabBox == chatBox){
		var scroll = Math.abs(chatBox.scrollTop - (chatBox.scrollHeight - chatBox.offsetHeight)) < 2;
		chatBox.appendChild(span);
		if (scroll) chatBox.scrollTop = chatBox.scrollHeight;
	}else{
		tabBox.appendChild(span);
	}
}
function chat(msg, fontcolor, name) {
	var span = document.createElement("span");
	if (fontcolor) span.style.color = fontcolor;
	span.appendChild(document.createTextNode(msg));
	addSpan(span, name);
}
module.exports = chat;
var tabMap = {};
chat.addTab = function(name, div){
	var tabBox = div || document.createElement("div");
	tabBox.id = "chatBox";
	tabMap[name] = tabBox;
	var span = document.createElement("span");
	span.className = "tab";
	span.appendChild(document.createTextNode(name));
	span.addEventListener("click", function(){
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
chat.addTab("Stats");
chat.addSpan = addSpan;
chat.clear = function(){
	while (chatBox.firstChild) chatBox.firstChild.remove();
}