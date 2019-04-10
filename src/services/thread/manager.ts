import { TrackedThreadManager, TrackedThread } from "../../interfaces";
import { injectable, inject } from "inversify";
import { IHandyRedis } from "handy-redis";
import { SERVICE } from "../../contants";
import { RedisFactory } from "../redis";
import { values } from 'lodash';
import { threadId } from "worker_threads";

@injectable()
export class RedisBasedTrackedThreadManager implements TrackedThreadManager {

    private readonly redis: IHandyRedis;

    constructor(@inject(SERVICE.REDIS) redisFactory: RedisFactory) {
        this.redis = redisFactory.create();
    }

    async open(thread: TrackedThread) {
        await this.redis.execMulti(this.redis.multi().
            hset(`${thread.channel}:tracked`, thread.threadId, thread.timestamp).
            hset(`${thread.channel}:open`, thread.threadId, JSON.stringify(thread)));
            
    }
    
    async close(thread: TrackedThread) {
        return await this.redis.hdel(`${thread.channel}:open`, thread.threadId) > 0;
    }

    async listOpen(channel: string): Promise<TrackedThread[]> {
        const result = await this.redis.hgetall(`${channel}:open`) as string[];
        return values(result).
            map(e => JSON.parse(e) as TrackedThread);
    }

    async isTracked(thread: TrackedThread) {
        return await this.redis.hexists(`${thread.channel}:tracked`, thread.threadId) > 0;   
    }
}