import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TOKEN;

import { join } from "path";
import logger from "./logger";

logger.info("Starting...");

import { ShardingManager } from "discord.js";
const manager = new ShardingManager(join(__dirname, "./bot.js"), { token, shardArgs: process.argv.slice(2) });
manager.spawn();

logger.info(`Shards spawned: ${manager.totalShards}`);
