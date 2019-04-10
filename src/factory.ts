import "reflect-metadata";
import { Container } from "inversify";

import { HandlerFactory, TrackedThreadManager, Message, MessageFactory } from './interfaces';

import { SERVICE, ARG } from "./contants";
import { SlackWebClient, SlackRTMClient } from "./services/slack";
import { MessageDispatcher } from "./services/dispatcher";
import { ClientOpts } from 'redis';
import { RedisFactory } from "./services/redis";
import { RedisBasedTrackedThreadManager } from "./services/thread/manager";
import { ThreadTrackerFactory } from "./services/thread/tracker";
import { CommandCall } from "./interfaces/command";
import { HelpCommand } from "./services/commands/help";
import { ListCommand } from "./services/commands/list";

import * as pino from "pino";
import { SimpleMessageFactory } from "./services/message";

export async function createDispatcher(config: Config) {

    const logger = pino({
        level: config.logLevel || 'info',
        timestamp: () => `,"time":"${new Date().toISOString()}"`
    });

    process.on('uncaughtException', (err) => {
        logger.child({ type: 'log' }).error(err);
        process.exit(1);
    });

    const container = new Container({ skipBaseClassChecks: true });

    container.bind<Config>(ARG.CONFIG).toConstantValue(config);

    container.bind<pino.Logger>(SERVICE.LOGGER)
        .toConstantValue(logger);
        
    container.bind<MessageDispatcher>(SERVICE.MESSAGE_DISPATCHER)
        .to(MessageDispatcher).inSingletonScope();

    container.bind<MessageFactory>(SERVICE.MESSAGE_FACTORY)
        .to(SimpleMessageFactory).inSingletonScope();

    container.bind<RedisFactory>(SERVICE.REDIS)
        .to(RedisFactory).inTransientScope();

    container.bind<HandlerFactory<Message>>(SERVICE.MESSAGE_HANDLER_FACTORY)
        .to(ThreadTrackerFactory).inTransientScope();

    container.bind<HandlerFactory<CommandCall>>(SERVICE.COMMAND_HANDLER_FACTORY)
        .to(HelpCommand).inSingletonScope();

    container.bind<HandlerFactory<CommandCall>>(SERVICE.COMMAND_HANDLER_FACTORY)
        .to(ListCommand).inSingletonScope();

    container.bind<TrackedThreadManager>(SERVICE.TRACKED_TRACK_MANAGER)
        .to(RedisBasedTrackedThreadManager).inSingletonScope();

    container.bind<SlackWebClient>(SERVICE.WEB_CLIENT)
        .to(SlackWebClient).inSingletonScope();

    container.bind<SlackRTMClient>(SERVICE.RTM_CLIENT)
        .to(SlackRTMClient).inSingletonScope();

    container.bind<Container>(SERVICE.CONTAINER)
        .toConstantValue(container);

    const dispatcher = container.get<MessageDispatcher>(SERVICE.MESSAGE_DISPATCHER);
    const rtmClient = container.get<SlackRTMClient>(SERVICE.RTM_CLIENT);

    await dispatcher.init();
    rtmClient.start();
}

export interface Config {
    token: string;
    botID: string;
    channelID: string;
    logLevel?: string;
    redis?: ClientOpts;
}