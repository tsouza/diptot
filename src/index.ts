#!/usr/bin/env node
import * as minimist from 'minimist';
import { createDispatcher, Config } from "./factory";

createDispatcher(parseArgv());

function parseArgv() {
    return minimist(argv()) as unknown as Config;
}

function argv() {
    const argv = process.argv;
    return process.argv.slice(argv[0] !== 'diptot' ? 2 : 1);
}