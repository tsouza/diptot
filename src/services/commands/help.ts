import { Handler, HandlerFactory, HandlerMetadata } from "../../interfaces";
import { CommandCall } from "../../interfaces/command";
import { Container, injectable, inject } from "inversify";
import { SERVICE } from "../../contants";

@injectable()
export class HelpCommand implements HandlerFactory<CommandCall>, HandlerMetadata {

    readonly name = 'help';
    readonly description = 'This help message';

    private readonly container: Container;

    constructor(
        @inject(SERVICE.CONTAINER) container: Container
    ) {
        this.container = container;
    }

    async create(): Promise<Handler<CommandCall>> {
        // tslint:disable-next-line:no-any
        return { handle: async (command: CommandCall, data: any): Promise<void> => {
            const commands = this.container.
                getAll<HandlerMetadata>(SERVICE.COMMAND_HANDLER_FACTORY).
                sort(compareHandlers).
                map(hmd => `\`${hmd.name}\`: ${hmd.description}`).
                join('\n');
            await command.replyWith(commands);
        } };
    }
}

function compareHandlers(a: HandlerMetadata, b: HandlerMetadata) {
    if (a.name === 'help') {
        return 1;
    } else if (b.name === 'help') {
        return -1;
    }
    return a.name.localeCompare(b.name);
}