import fs from 'fs/promises';
import AllCards from '../src/AllCards.js';
import Decks from '../src/Decks.json' assert { type: 'json' };

const source = ["pub const CARD_STRINGS:&[(u16,&'static str)]=&["];
AllCards.Codes.forEach((card, code) => {
	if (card.shiny) return;
	source.push(
		`(${card.code},r#"${card
			.info()
			.replaceAll('&', '&amp;')
			.replace(/(\d\d?):(\d\d?) ?/g, (m, n, e) => {
				switch (n | 0) {
					case 0:
						return '0';
					case 1:
						return `<span class='ico te${e}'></span>`;
					case 2:
						return `<span class='ico te${e}'></span><span class='ico te${e}'></span>`;
					case 3:
						return `<span class='ico te${e}'></span><span class='ico te${e}'></span><span class='ico te${e}'></span>`;
					default:
						return `${n}<span class='ico te${e}'></span>`;
				}
			})}"#),`,
	);
});
source.push('];');
source.push(`pub const MAGE_COUNT:u8=${Decks.mage.length};`);
source.push(`pub const DG_COUNT:u8=${Decks.demigod.length};`);
await fs.writeFile(
	'./src/rs/server/src/generated.rs',
	source.join('\n'),
	'utf8',
);
