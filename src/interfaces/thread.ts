export interface TrackedThreadManager {
    open(thread: TrackedThread): Promise<void>;
    close(thread: TrackedThread): Promise<boolean>;
    listOpen(channel: string): Promise<TrackedThread[]>;
    isTracked(thread: TrackedThread): Promise<boolean>;
}

export interface TrackedThread {
    channel: string;
    threadId: string;
    userId: string;
    timestamp: string;
    text: string;
    link: string;
} 