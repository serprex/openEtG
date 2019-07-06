import vanillaCards from '../Cards.json';
import ciaCards from '../../../cia/Cards.json';
for (let i = 0; i < vanillaCards.length; i++) {
	vanillaCards[i] = ciaCards[i];
}
import './main.js';
