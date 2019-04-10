import { Handler, HandlerFactory, MessageFactory } from "../../interfaces";
import { injectable, named, inject } from "inversify";
import { TrackedThreadManager, TrackedThread } from "../../interfaces";
import { SERVICE, ARG } from "../../contants";
import { SlackWebClient } from "../slack";
import { Config } from "../../factory";
import { Message } from "../../interfaces";
import { toTrackedThread } from "../../utils";
import { Logger } from "pino";
import { merge } from 'lodash';
import { map, each } from "bluebird";

@injectable()
export class ThreadTrackerFactory implements HandlerFactory<Message> {
    
    private readonly messageFactory: MessageFactory;
    private readonly webClient: SlackWebClient;
    private readonly manager: TrackedThreadManager;

    private readonly botID: string;

    private readonly logger: Logger;

    constructor(
        @inject(SERVICE.MESSAGE_FACTORY) messageFactory: MessageFactory,
        @inject(SERVICE.WEB_CLIENT) webClient: SlackWebClient,
        @inject(SERVICE.TRACKED_TRACK_MANAGER) manager: TrackedThreadManager,
        @inject(SERVICE.LOGGER) logger: Logger,
        @inject(ARG.CONFIG) config: Config
    ) {
        this.messageFactory = messageFactory;
        this.webClient = webClient;
        this.botID = config.botID;
        this.manager = manager;

        this.logger = logger;
    }

    async create(): Promise<Handler<Message>> {
         // tslint:disable-next-line:no-any
        const response = await this.webClient.bots.info({ bot: this.botID }) as any;
        if (!response.ok || !response.bot) {
            throw new Error(`No such bot ${this.botID}`);
        }
        return new ThreadTracker(this.messageFactory, this.webClient, this.manager, response.bot.user_id, this.logger);
    }
}

class ThreadTracker implements Handler<Message> {

    private readonly messageFactory: MessageFactory;
    private readonly webClient: SlackWebClient;
    private readonly manager: TrackedThreadManager;

    private readonly botRef: string;
    private readonly threadIsCCOnlyRe: RegExp;
    private readonly threadEndsWithRe: RegExp;

    private readonly logger: Logger;
    private readonly trackedLogger: Logger;

    constructor(
        messageFactory: MessageFactory,
        webClient: SlackWebClient,
        manager: TrackedThreadManager,
        botUserID: string,
        logger: Logger
    ) {
        this.messageFactory = messageFactory;
        this.webClient = webClient;
        this.manager = manager;

        this.botRef = `<@${botUserID}>`;
        const threadCC = `/?cc\\s+${this.botRef}`;
        this.threadIsCCOnlyRe = new RegExp(`^${threadCC}$`);
        this.threadEndsWithRe = new RegExp(`^.+\\s+${threadCC}$`);

        this.logger = logger.child({ type: 'log' });
        this.trackedLogger = logger.child({ type: 'thread' });
    }

    // tslint:disable-next-line:no-any
    async handle(message: Message, data: any): Promise<void> {
        this.doHandle(message, data);
    }

    // tslint:disable-next-line:no-any
    private async doHandle(message: Message, data: any, silent = false): Promise<void> {
        const thread = toTrackedThread(message);
        let text = message.text.trim();
        let tracked = false, reply = false;
        const endsWithCC = this.threadEndsWithRe.test(text),
            isCCOnly = this.threadIsCCOnlyRe.test(text),
            isThreadStart = endsWithCC && !data.thread_ts;

        if (isThreadStart) {
            text = thread.text = message.text = this.stripCC(text);
            await this.manager.open(thread);
            if (!silent) {
                await this.webClient.sendDM('diptot', message.user.id,
                    `Hey there! Thanks for your question! I am keeping track of it now! ${message.link}`);
            }
            this.logger.info(`opened thread %s from @%s`, message.threadId, message.user.id);
            tracked = true;
        } else if (data.thread_ts) {
            reply = true;
            tracked = await this.manager.isTracked(thread);
            if (tracked) {
                if (await this.manager.close(thread)) {
                    this.logger.info(`closed thread %s@%s from @%s`,
                        message.threadId,
                        message.channel,
                        message.user.name);
                }
                this.logger.info('@%s replied to thread %s@%s',
                    message.user.name,
                    message.threadId,
                    message.channel);
            } else if (isCCOnly) {
                let threadStarted = false;
                const messages = (await this.webClient.fetchHistory(message.channel, message.threadId)).
                    filter(data => !this.threadIsCCOnlyRe.test(data.text));

                const hasReply = messages.length > 1;
                
                await each(messages, async data => {
                    let message;
                    if (!threadStarted) {
                        data.text += ` /cc ${this.botRef}`;
                        message = await this.messageFactory.create(data);
                        delete data.thread_ts;
                        threadStarted = true;
                    } else {
                        message = await this.messageFactory.create(data);
                    }
                    await this.doHandle(message, data, hasReply);
                });
            }
        }

        if (tracked) {
            this.trackedLogger.info(merge({ reply }, message));
        }
    }

    private stripCC(text: string) {
        const idx = text.lastIndexOf(`cc ${this.botRef}`);
        text = text.substring(0, idx);
        if (text.endsWith('/')) {
            text = text.substring(0, text.length - 1);
        }
        return text.trim();
    }

}