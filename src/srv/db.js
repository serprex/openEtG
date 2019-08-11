import config from '../../config.json';
import redis from 'ioredis';
export default new redis(config.redis);
