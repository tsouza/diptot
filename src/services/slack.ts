import { WebClient, RTMClient, MessageAttachment, LogLevel, WebAPICallOptions, WebAPICallResult } from "@slack/client";
import { injectable, named, inject } from "inversify";

import { ARG } from "../contants";
import { SmartLRUCache } from "../utils";
import { User, Message } from "../interfaces";
import { Config } from "../factory";
import { isEmpty, merge } from "lodash";

@injectable()
export class SlackWebClient extends WebClient {

    private readonly userCache = new SmartLRUCache<string, User>({
        max: 50, factory: (key: string) => this.doGetUser(key)
    });
 
    private readonly imCache = new SmartLRUCache<string, string>({
        max: 50, factory: (key: string) => this.getDirectID(key)
    });

    constructor(@inject(ARG.CONFIG) config: Config) {
        super(config.token);
    }

        // tslint:disable:no-any
    async getUserTZ(user: string) {
        const response = await this.users.info({ user }) as any;
        if (!response.ok) {
            throw new Error(`Error fetching user tz ${user}`);
        }
        return response.user.tz;
    }

    async getUser(user: string): Promise<User> {
        return await this.userCache.get(user);
    }

    /*apiCall(method: string, options?: WebAPICallOptions | undefined): Promise<WebAPICallResult> {
        console.log(method, options);
        return super.apiCall(method, options);
    }*/

    private async doGetUser(user: string): Promise<User> {
        // tslint:disable-next-line:no-any
        const response = await this.users.info({ user }) as any;
        if (!response.ok || !response.user) {
            throw new Error(`No such user ${user}`);
        }
        return {
            id: response.user.id as string,
            name: response.user.name as string,
            displayName: response.user.real_name as string
        };
    }

    async sendDM(from: string, to: string, text: string, attachments?: MessageAttachment[]) {
        await this.chat.postMessage({
            channel: await this.imCache.get(to),
            text, as_user: true, user: from,
            parse: 'full', attachments,
            unfurl_links: true
        });
    }

    // tslint:disable:no-any
    async fetchHistory(channel: string, thread: string): Promise<any[]> {
        const response = await this.conversations.replies({ channel, ts: thread, limit: 200 }) as any;
        if (!response.ok) {
            throw new Error(`Could not fetch history for ${thread}@${channel}`);
        } else {
            if (isEmpty(response.messages)) {
                return [];
            } else {
                const head = response.messages[0];
                delete head.reply_count;
                delete head.reply_users_count;
                delete head.latest_reply;
                delete head.reply_users;
                delete head.replies;
                return response.messages.
                    map((msg: any) => merge(msg, { channel }));
            }
        }
    }

    private async getDirectID(user: string) {
        // tslint:disable-next-line:no-any
        const response = await this.im.open({ user }) as any;
        if (!response.ok || !response.channel) {
            throw new Error(`Could not open IM with user ${user}`);
        }
        return response.channel.id as string;
    }

       // tslint:disable-next-line:no-any
    async getPermaLink(data: any) {
        const response = await this.chat.getPermalink({
            channel: data.channel as string,
            message_ts: data.ts as string
        // tslint:disable-next-line:no-any
        }) as any;
        if (!response.ok || !response.permalink) {
            throw new Error(`Could not get permaLink for ${data.channel}@${data.ts}`);
        }
        return response.permalink;
    }
}

@injectable()
export class SlackRTMClient extends RTMClient {
    constructor(@inject(ARG.CONFIG) config: Config) {
        super(config.token);
    }
}