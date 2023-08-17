import { Events, Message } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";
import { Guild, GuildMember, LevelingRole, NoXpChannel, NoXpRole } from "@prisma/client";
import XpCalculator from "../util/XpCalculator";
import { messages } from "../keyv";

type GuildMemberWithGuildAndLevelingSettings = GuildMember & {
  Guild: Guild & {
    noXpRoles: NoXpRole[];
    noXpChannels: NoXpChannel[];
    levelingRoles: LevelingRole[];
  };
};

const maxXpPerMessage = 500;
const idealLength = 500;

const messageExpiry = 6 * 60 * 60_000;

//TODO negate xp for messages that get deleted

const data: EventData = {
  name: Events.MessageCreate,
  once: false,
};

class Impl extends EventExecutable {
  async execute(bot: Bot, message: Message) {
    if (message.author.bot) return;

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
        User: true,
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
          User: true,
        },
      });

    // prettier-ignore
    if (member.Guild.levelingEnabled && 
      member.Guild.levelingRoles.length > 0 && 
      !member.Guild.noXpChannels.find(c => c.id === message.channelId) &&
      !guildMember.roles.cache.hasAny(...member.Guild.noXpRoles.map((r) => r.id))
    ) this.calculateLeveling(bot, message, member);
  }

  async calculateLeveling(bot: Bot, message: Message, member: GuildMemberWithGuildAndLevelingSettings) {
    if (message.author.id === message.guild.ownerId) return;

    if (!member.lastMessageTimestamp) {
      await bot.prisma.guildMember.update({
        where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        data: { lastMessageTimestamp: message.createdAt },
      });
      return;
    }

    await bot.levelingManager.handleMessage(message, member)
  }
}

export default { name: data.name, once: data.once, Impl };
