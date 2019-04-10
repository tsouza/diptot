export const SERVICE = {
    MESSAGE_HANDLER_FACTORY: Symbol.for("HandlerFactory<Message>"),
    COMMAND_HANDLER_FACTORY: Symbol.for("HandlerFactory<CommandCall>"),
    MESSAGE_DISPATCHER: Symbol.for("MessageDispatcher"),
    MESSAGE_FACTORY: Symbol.for("MessageFactory"),
    WEB_CLIENT: Symbol.for("SlackWebClient"),
    RTM_CLIENT: Symbol.for("SlackRTMClient"),
    TRACKED_TRACK_MANAGER: Symbol.for("RedisBasedTrackedThreadManager"),
    REDIS: Symbol.for("RedisFactory"),
    ELASTICSEARCH: Symbol.for("ElasticsearchFactory"),
    LOGGER: Symbol.for("Logger"),

    CONTAINER: Symbol.for("Container")
};

export const ARG = {
    CONFIG: Symbol.for('Config')
};