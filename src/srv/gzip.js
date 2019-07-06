import { gzip } from 'zlib';
import { promisify } from 'util';
export default promisify(gzip);
