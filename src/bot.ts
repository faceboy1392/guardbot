const token = process.env.TOKEN;

import { IntentsBitField as Intents, Partials } from "discord.js";
import Bot from "./classes/Bot";
import { Command } from "./classes/Command";
import { Event } from "./classes/Event";

import logger from "./logger";
import path from "path";
import glob from "glob";

const bot = new Bot({
  partials: [Partials.Channel, Partials.User, Partials.GuildMember],
  intents: [Intents.Flags.Guilds, Intents.Flags.GuildPresences, Intents.Flags.GuildMessages, Intents.Flags.MessageContent],
  allowedMentions: { parse: [] },
});

export default bot;
const { client } = bot;

glob("./commands/**/*.js", { cwd: __dirname }, async (err, files) => {
  if (err) throw err;

  for (const file of files) {
    const command: Command = (await import(path.join(__dirname, file))).default;
    if (!("data" in command) || !("Impl" in command) || (!("name" in command) && !file.endsWith(".txt"))) {
      logger.warn(`Empty/invalid command file: ${file}`);
      continue;
    }
    bot.commands.set(command.name, command);
  }

  // Login after loading commands to guarantee they are all loaded before 'ready' event
  client.login(token);
});

glob("./events/*.js", { cwd: __dirname }, async (err, files) => {
  if (err) throw err;

  for (const file of files) {
    const event: Event = (await import(path.join(__dirname, file))).default;
    bot.events.set(event.name, event);

    if (event.once) {
      client.once(event.name, (...args: any) => {
        new event.Impl().execute(bot, ...args).catch((err) => logger.error(err));
      });
    } else {
      client.on(event.name, (...args: any) => {
        new event.Impl().execute(bot, ...args).catch((err) => logger.error(err));
      });
    }
  }
});