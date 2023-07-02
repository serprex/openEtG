import Cards from './Cards.js';
import OriginalCards from './vanilla/Cards.js';

const Codes = [];
Cards.Codes.forEach((card, code) => (Codes[code] = card));
OriginalCards.Codes.forEach((card, code) => (Codes[code] = card));

export default { Codes };