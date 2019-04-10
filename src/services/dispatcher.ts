// tslint:disable:array-type
import { HandlerFactory, Handler, Message, HandlerMetadata, MessageFactory } from "../interfaces";
import { RTMClient, MessageAttachment } from "@slack/client";
import { SERVICE } from "../contants";
import { inject, multiInject, injectable } from "inversify";
import { map, each } from "bluebird";
import { parseSlackTimestamp, isDMChannel } from "../utils";
import { SlackWebClient } from "./slack";
import { CommandCall } from "../interfaces/command";
import { Logger } from "pino";

@injectable()
export class MessageDispatcher {
    
    private readonly messageFactory: MessageFactory;
    private readonly webClient: SlackWebClient;
    private readonly rtmClient: RTMClient;
    
    private msgHandlerFactory: HandlerFactory<Message>;
    private msgHandler?: Handler<Message>;

    private cmdHandlerFactories: HandlerFactory<CommandCall>[];
    private cmdHandlers: CommandHandlers = {};

    private readonly logger: Logger;

    constructor(
        @inject(SERVICE.MESSAGE_FACTORY) messageFactory: MessageFactory,
        @inject(SERVICE.WEB_CLIENT) webClient: SlackWebClient,
        @inject(SERVICE.RTM_CLIENT) rtmClient: RTMClient,
        @inject(SERVICE.LOGGER) logger: Logger,
        @inject(SERVICE.MESSAGE_HANDLER_FACTORY) msgHandlerFactory: HandlerFactory<Message>,
        @multiInject(SERVICE.COMMAND_HANDLER_FACTORY) cmdHandlerFactories: HandlerFactory<CommandCall>[]
    ) {
        this.messageFactory = messageFactory;
        this.webClient = webClient;
        this.rtmClient = rtmClient;
        this.msgHandlerFactory = msgHandlerFactory;
        this.cmdHandlerFactories = cmdHandlerFactories;

        this.logger = logger.child({ type: 'log' });
    }

    async init() {
        this.msgHandler = await this.msgHandlerFactory.create();

        await each(this.cmdHandlerFactories,
            async factory => {
                const handler = await factory.create();
                const metadata = factory as unknown as HandlerMetadata;
                this.cmdHandlers[metadata.name] = handler;
            });

        this.rtmClient.on('message', data => this.dispatch(data));
        this.logger.info('connected to slack and listening to events');
    }

    // tslint:disable-next-line:no-any
    private async dispatch(data: any) {
        try {
            this.logger.trace(data);
            if (!data.bot_id && (data.type === 'message' && !data.subtype && data.client_msg_id)) {
                if (!this.logger.isLevelEnabled('trace')) {
                    this.logger.debug(data);
                }
                if (!isDMChannel(data.channel)) {
                    const message = await this.messageFactory.create(data);
                    if (this.msgHandler) {
                        await this.msgHandler.handle(message, data);
                    }
                } else {
                    const call = await this.createCommandCall(data);
                    const commandName = call.text.trim().toLowerCase();
                    if (!(commandName in this.cmdHandlers)) {
                        await call.replyWith(`Sorry, I don't understand what \`${commandName}\` is, please try \`help\` for all possible commands`);
                    } else {
                        await this.cmdHandlers[commandName].handle(call, data);
                    }
                }
            }
        } catch (err) {
            this.logger.error(err);
        }
    }

    // tslint:disable-next-line:no-any
    private async createCommandCall(data: any): Promise<CommandCall> {
        return {
            id: data.client_msg_id,
            timestamp: parseSlackTimestamp(data.ts),
            user: await this.webClient.getUser(data.user),
            text: data.text,

            replyWith: async (message: string, attachments?: MessageAttachment[]): Promise<void> => {
                await this.webClient.sendDM('diptot', data.user, message, attachments);
            }
        };
    }
}

interface CommandHandlers {
    [name: string]: Handler<CommandCall>;
}