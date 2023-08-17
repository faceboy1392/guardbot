import { Events, Message } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";
import { messages } from "../keyv";
import XpCalculator from "../util/XpCalculator";

const data: EventData = {
  name: Events.MessageDelete,
  once: false,
};

class Impl extends EventExecutable {
  async execute(bot: Bot, message: Message) {
    if (message.author.bot) return;
    if (message.channel.isDMBased()) return;

    const guildMember = await message.guild.members.fetch(message.author.id);

    let member = await bot.prisma.guildMember.findUnique({
      where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
      include: {
        Guild: {
          include: {
            noXpRoles: true,
            noXpChannels: true,
            levelingRoles: { orderBy: { rank: "asc" } },
          },
        },
      },
    });
    if (!member)
      member = await bot.prisma.guildMember.create({
        data: {
          User: { connectOrCreate: { where: { id: message.author.id }, create: { id: message.author.id } } },
          Guild: { connectOrCreate: { where: { id: message.guildId }, create: { id: message.guildId } } },
        },
        include: {
          Guild: {
            include: {
              noXpRoles: true,
              noXpChannels: true,
              levelingRoles: { orderBy: { rank: "asc" } },
            },
          },
        },
      });

    if (
      member.Guild.levelingEnabled &&
      member.Guild.levelingRoles.length > 0 &&
      !member.Guild.noXpChannels.find((c) => c.id === message.channelId) &&
      !guildMember.roles.cache.hasAny(...member.Guild.noXpRoles.map((r) => r.id))
    ) {
      const storedMessage = await messages.get(message.id);
      if (storedMessage) {
        // deleting a message will lose 50% of the xp that that message originally gave. this will not decrease ranks
        const calc = new XpCalculator(member.xp, member.rank).removeXp(storedMessage.xp * 0.5, false);
        await bot.prisma.guildMember.update({
          where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
          data: {
            xp: calc.xp,
            rank: calc.rank
          },
        });
        await messages.delete(message.id);
      }
    }
  }
}

export default { name: data.name, once: data.once, Impl };
