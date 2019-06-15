const vanillaCards = require('../Cards.json'),
	ciaCards = require('../../../cia/Cards.json');
for (let i=0; i<vanillaCards.length; i++)
{
	vanillaCards[i] = ciaCards[i];
}
require('./main');