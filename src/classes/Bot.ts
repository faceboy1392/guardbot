import { Client, ClientOptions, Collection } from 'discord.js'
import config from "../../config.json";

import { Command } from "./Command";
import { Event } from "./Event";
// import CustomEmoji from "./CustomEmoji";

import { PrismaClient } from "@prisma/client";
import logger from '../logger';

export default class Bot {
  client: Client;
  config = config;
  
  commands = new Collection<string, Command>();
  events = new Collection<string, Event>();
  // emojis = new Collection<string, CustomEmoji>();

  prisma = new PrismaClient()
  log = logger;

  constructor(options: ClientOptions) {
    this.client = new Client(options);
  }
}