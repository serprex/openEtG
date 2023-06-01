import fs from 'fs/promises';
import AllCards from '../src/AllCards.js';
import Decks from '../src/Decks.json' assert { type: 'json' };
import starter from '../src/starter.json' assert { type: 'json' };
import originalstarter from '../src/original-starter.json' assert { type: 'json' };

const source = ["pub const CARD_STRINGS:&[(u16,&'static str,&'static str)]=&["];
AllCards.Codes.forEach((card, code) => {
	if (card.shiny) return;
	source.push(
		`(${card.code},r#"${card.name}"#,r#"${card
			.info()
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
source.push(
	"pub const STARTERS:&'static [(&'static str,&'static str,&'static str,&'static str,u8,u8)]=&[",
);
for (let i = 0; i < starter.length; i += 6) {
	source.push(
		`("${starter[i]}","${starter[i + 1]}","${starter[i + 2]}","${
			starter[i + 3]
		}",${starter[i + 4]},${starter[i + 5]}),`,
	);
}
source.push('];');
source.push(
	"pub const ORIGINAL_STARTERS:&'static [(&'static str,&'static str)]=&[",
);
for (let i = 0; i < originalstarter.length; i += 2) {
	source.push(`("${originalstarter[i]}","${originalstarter[i + 1]}"),`);
}
source.push('];');
await fs.writeFile(
	'./src/rs/server/src/generated.rs',
	source.join('\n'),
	'utf8',
);