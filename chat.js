var chatBox = document.getElementById("chatBox");
function addSpan(span) {
	span.appendChild(document.createElement("br"));
	var scroll = Math.abs(chatBox.scrollTop - (chatBox.scrollHeight - chatBox.offsetHeight)) < 2;
	chatBox.appendChild(span);
	if (scroll) chatBox.scrollTop = chatBox.scrollHeight;
}
function chat(msg, fontcolor) {
	var span = document.createElement("span");
	if (fontcolor) span.style.color = fontcolor;
	span.appendChild(document.createTextNode(msg));
	addSpan(span);
}
module.exports = chat;
chat.addSpan = addSpan;