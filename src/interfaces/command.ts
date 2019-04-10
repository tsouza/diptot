import { User } from '.';
import { MessageAttachment } from '@slack/client';

export interface CommandCall {
    readonly id: string;
    readonly timestamp: string;
    readonly user: User;
    readonly text: string;

    replyWith(text: string, attachments?: MessageAttachment[]): Promise<void>;
}