export interface Handler<T> {
    // tslint:disable-next-line:no-any
    handle(message: T, data: any): Promise<void>;
}

export interface HandlerFactory<T> {
    create(): Promise<Handler<T>>;
}

export interface HandlerMetadata {
    readonly name: string;
    readonly description: string;
}

