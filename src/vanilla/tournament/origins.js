module.exports = function(deck) {
	allowedCards = ("4sa 4sj 4sk 4sl 4sm 4sn 4so 4sp 4sq 4sr 4ss 4st 4su 4t3 4t4 4t5 4vc 4vd 4ve 4vf 4vg 4vh 4vi 4vj 4vk 4vl 4vm 52g 52h 52i 52j 52k 52l 52m 52n 52o 52p 52q 52r 55k 55l 55m 55n 55o 55p 55q 55r 55s 55t 55u 58o 58p 58q 58r 58s 58t 58u 58v 590 591 " +
	"592 593 5bs 5bt 5bu 5bv 5c0 5c1 5c2 5c4 5c5 5c6 5f0 5f1 5f2 5f3 5f4 5f5 5f6 5f7 5f8 5f9 5fa 5i4 5i5 5i6 5i7 5i8 5i9 5ia 5ib 5ic 5id 5ie 5if 5l8 5l9 5la 5lb 5lc 5ld 5le 5lf 5lg 5lh 5li 5oc 5od 5oe 5of 5og 5oh 5oi 5oj 5ok 5ol 5rg 5rh 5ri 5rj " +
	"5rk 5rl 5rm 5rn 5ro 5uk 5ul 5um 5un 5uo 5up 5uq 5ur 5us 5ut 61o 61p 61q 61r 61s 61t 61u 61v 620").split(" ");
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.upped) return "Upgraded cards are banned";
		if (!~allowedCards.indexOf(card.code)) return card.name + " is not allowed";
	}
	return "Legal";
}