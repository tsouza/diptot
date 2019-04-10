import * as LRUCache from 'lru-cache';
import { Message, TrackedThread } from './interfaces';

export function parseSlackTimestamp(timestamp: string) {
    timestamp = timestamp.split('.')[0];
    return (new Date(+timestamp * 1000)).toISOString();
}

export function isDMChannel(channel: string): boolean | "" {
    return channel && channel[0] === 'D';
}

export class SmartLRUCache<K, V> extends LRUCache<K, Promise<V>> {

    private readonly createEntry: (key: K) => Promise<V>;

    constructor(options: SmartLRUCache.Options<K, Promise<V>>) {
        super(options);
        this.createEntry = options.factory.bind(options.factory);
    }

    async get(key: K) {
        let entry = super.get(key);
        if (entry) {
            return entry;
        }
        entry = new Promise<V>(async (resolve, reject) => {
            try {
                const result = await this.createEntry(key);
                resolve(result);
            } catch (e) {
                this.del(key);
                reject(e);
            }
        });
        this.set(key, entry);
        return entry;
    }
}

// tslint:disable-next-line:no-namespace
export namespace SmartLRUCache {
    export interface Options<K, V> extends LRUCache.Options<K, V> {
        factory: (key: K) => V;
    }
}

export function toTrackedThread(message: Message): TrackedThread {
    return {
        channel: message.channel,
        threadId: message.threadId,
        userId: message.user.id,
        timestamp: message.timestamp,
        text: message.text,
        link: message.link
    };
}