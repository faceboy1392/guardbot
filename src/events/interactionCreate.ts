import { Events, Interaction } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";
import Context from "../util/Context";
import { Guild } from "@prisma/client";

const data: EventData = {
  name: Events.InteractionCreate,
  once: false,
};

class Impl extends EventExecutable {
  async execute(bot: Bot, i: Interaction) {
    if (!i.isCommand()) return;
    const isDM = i.channel.isDMBased();

    const command = bot.commands.get(i.commandName);

    let settings = isDM ? undefined : await bot.prisma.guild.findUnique({ where: { id: i.guildId } });
    if (settings === null) settings = await bot.prisma.guild.create({ data: { id: i.guildId } });
    const context = new Context(i, isDM ? undefined : settings);

    try {
      new command.Impl().execute(bot, i, context);
    } catch (err) {
      bot.log.error(err);
    }
  }
}

export default { name: data.name, once: data.once, Impl };
