import { MessageFactory, Message } from "../interfaces";
import { injectable, inject } from "inversify";
import { SlackWebClient } from "./slack";
import { SERVICE } from "../contants";
import { parseSlackTimestamp } from "../utils";

@injectable()
export class SimpleMessageFactory implements MessageFactory {
    private readonly webClient: SlackWebClient;

    constructor(
        @inject(SERVICE.WEB_CLIENT) webClient: SlackWebClient
    ) {
        this.webClient = webClient;
    }

    // tslint:disable-next-line:no-any
    async create(data: any): Promise<Message> {
        return {
            id: data.client_msg_id,
            timestamp: parseSlackTimestamp(data.ts),
            threadId: data.thread_ts || data.event_ts,
            user: await this.webClient.getUser(data.user),
            channel: data.channel,
            text: data.text,
            link: await this.webClient.getPermaLink(data)
        };
    }
}