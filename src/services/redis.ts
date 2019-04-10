import { injectable, inject } from "inversify";
import { createHandyClient } from 'handy-redis';
import { ARG } from "../contants";
import { Config } from "../factory";
import { ClientOpts } from "redis";


@injectable()
export class RedisFactory {

    private readonly redisConfig?: ClientOpts;    
    
    constructor(@inject(ARG.CONFIG) config: Config) {
        this.redisConfig = config.redis;
    }

    create() {
        return createHandyClient(this.redisConfig);
    }

}