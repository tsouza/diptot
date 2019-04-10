import { Handler, HandlerFactory, HandlerMetadata, TrackedThreadManager, TrackedThread } from "../../interfaces";
import { CommandCall } from "../../interfaces/command";
import { injectable, inject } from "inversify";
import { SlackWebClient } from "../slack";
import { SERVICE, ARG } from "../../contants";
import { Config } from "../../factory";
import { each } from "bluebird";
import { utcToZonedTime } from 'date-fns-tz';
import { formatDistance } from "date-fns";

const { asc } = require('comparator');

@injectable()
export class ListCommand implements HandlerFactory<CommandCall>, HandlerMetadata {

    readonly name = 'list';
    readonly description = 'Lists open questions';

    private readonly manager: TrackedThreadManager;

    private readonly channelID: string;
    private readonly webClient: SlackWebClient;

    constructor(
        @inject(ARG.CONFIG) config: Config,
        @inject(SERVICE.TRACKED_TRACK_MANAGER) manager: TrackedThreadManager,
        @inject(SERVICE.WEB_CLIENT) webClient: SlackWebClient,
    ) {
        this.channelID = config.channelID;
        this.manager = manager;
        this.webClient = webClient;
    }

    async create(): Promise<Handler<CommandCall>> {
        // tslint:disable-next-line:no-any
        return { handle: async (command: CommandCall, data: any): Promise<void> => {
            const threads = (await this.manager.listOpen(this.channelID)).
                sort(asc('timestamp'));
            if (!threads.length) {
                await command.replyWith('Yay! No open questions!');
            } else {
                const tz = await this.webClient.getUserTZ(command.user.id);
                await each(threads, async thread => 
                    await command.replyWith(await this.toText(thread, tz, command.timestamp)));
                /*await command.replyWith('Currently open questions:',
                    await map(threads, async thread => await this.toAttachment(thread, tz, command.timestamp)));*/
            }
        } };
    }

    private async toText(thread: TrackedThread, userTZ: string, commandTimestamp: string): Promise<string> {
        const user = await this.webClient.getUser(thread.userId);
        const threadTimestamp = utcToZonedTime(thread.timestamp, userTZ);
        const userTimestamp = utcToZonedTime(commandTimestamp, userTZ);
        const timestampDistance = formatDistance(threadTimestamp, userTimestamp);
        return `*${user.displayName}* _(${timestampDistance} ago)_:\n${thread.link}`;
    }    

    /*private async toAttachment(thread: TrackedThread, userTZ: string, commandTimestamp: string): Promise<MessageAttachment> {
        const user = await this.webClient.getUser(thread.userId);
        const threadTimestamp = utcToZonedTime(thread.timestamp, userTZ);
        const userTimestamp = utcToZonedTime(commandTimestamp, userTZ);
        const timestampDistance = formatDistance(threadTimestamp, userTimestamp);
        return {
            fallback: `${user.name}: ${thread.text}`,
            author_name: `By ${user.displayName}`,
            author_link: thread.link,
            title: `${timestampDistance} ago`,
            title_link: thread.link,
            text: thread.text,
            ts: thread.timestamp_epoch,
            actions: [
                { text: 'Open', type: 'button', url: thread.link }
            ]
        };
    }*/
}