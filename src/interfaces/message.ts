import { User } from '.';

export interface Message {
    id: string;
    timestamp: string;
    threadId: string;
    user: User;
    channel: string;
    text: string;
    link: string;
}

export interface MessageFactory {
    // tslint:disable-next-line:no-any
    create(data: any): Promise<Message>;
}
