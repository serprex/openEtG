import Cards from './Cards.js';
import OriginalCards from './vanilla/Cards.js';

const AllCards = { Codes: [] };
Cards.Codes.forEach((card, code) => (AllCards.Codes[code] = card));
OriginalCards.Codes.forEach((card, code) => (AllCards.Codes[code] = card));

export default AllCards;
