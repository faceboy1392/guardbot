import { Client, ClientOptions, Collection } from "discord.js";
import config from "../../config.json";

import { Command } from "./Command";
import { Event } from "./Event";
// import CustomEmoji from "./CustomEmoji";

import { PrismaClient } from "@prisma/client";
import logger from "../logger";
import colors from "../util/colors";
import LevelingManager from "../util/LevelingManager";

export default class Bot {
  client: Client;
  config = config;
  colors = colors;

  commands = new Collection<string, Command>();
  events = new Collection<string, Event>();
  // emojis = new Collection<string, CustomEmoji>();
  levelingManager: LevelingManager;

  prisma = new PrismaClient();
  log = logger;

  constructor(options: ClientOptions) {
    this.client = new Client(options);
    this.levelingManager = new LevelingManager(this);
  }
}
