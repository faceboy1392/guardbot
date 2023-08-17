import { Events, Interaction } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";
import Context from "../util/Context";
import AssertException from "../classes/AssertException";

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
    const context = new Context(bot, i, isDM ? undefined : settings);

    if (!isDM) {
      let memberRow = await bot.prisma.guildMember.findUnique({ where: { userId_guildId: { userId: i.user.id, guildId: i.guildId } } });
      if (!memberRow) {
        await bot.prisma.guildMember.create({ data: { User: { connectOrCreate: { where: { id: i.user.id }, create: { id: i.user.id } } }, Guild: { connectOrCreate: { where: { id: i.guildId }, create: { id: i.guild.id } } } } });
      }

      if (command.data.perms.bot) {
        if (!i.appPermissions.has(command.data.perms.bot)) return context.re(`:x: Sorry, I don't have the perms I need to run that command. I need: \`${i.appPermissions.missing(command.data.perms.bot).join(", ")}\``);
      }
    }

    try {
      await new command.Impl().execute(bot, i, context);
    } catch (err) {
      if (!(err instanceof AssertException)) bot.log.error(err);
    }
  }
}

export default { name: data.name, once: data.once, Impl };
