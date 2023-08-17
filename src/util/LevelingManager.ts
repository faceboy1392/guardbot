import { LevelingRole, NoXpChannel, NoXpRole, Guild as PrismaGuild, GuildMember as PrismaGuildMember } from "@prisma/client";
import XpCalculator from "./XpCalculator";
import Bot from "../classes/Bot";
import { ChannelType, GuildMember, Message } from "discord.js";
import { messages } from "../keyv";
import guildWarning from "./guildWarning";

export type GuildMemberWithGuildAndLevelingSettings = PrismaGuildMember & {
  Guild: PrismaGuild & {
    noXpRoles: NoXpRole[];
    noXpChannels: NoXpChannel[];
    levelingRoles: LevelingRole[];
  };
};

export default class LevelingManager {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  async handleMessage(message: Message, memberData: GuildMemberWithGuildAndLevelingSettings): Promise<void> {
    // Make sure all leveling settings are valid
    if (!memberData.Guild.levelingEnabled) return;
    if (memberData.Guild.levelingRoles.length == 0) return;
    if (memberData.Guild.noXpChannels.find((c) => c.id === message.channelId)) return;
    if (message.member.roles.cache.hasAny(...memberData.Guild.noXpRoles.map((r) => r.id))) return;

    // don't count messages that are sent too fast
    // note that it won't update lastMessageTimestamp until they get past this rate limit, so new messages in the rate limit don't reset it
    if (message.createdAt.getTime() - memberData.lastMessageTimestamp.getTime() < 8_000) return;

    const xpMultiplier = memberData.Guild.xpMultiplier;

    let xpFromMessage = Math.round(this.calculateXpForMessage(message));
    xpFromMessage *= xpMultiplier;

    const calc = new XpCalculator(memberData.xp, memberData.rank);
    calc.addXp(xpFromMessage);
    calc.maxXpAndRank(this.bot.config.leveling.maxXp, this.bot.config.leveling.maxRank);

    // Handle leveling up
    if (calc.rank > memberData.rank) await this.adjustRoles(message.member, calc.rank, memberData);

    // In-memory Keyv database that just makes sure that if a message gets deleted, some of its xp is also removed
    messages.set(message.id, { xp: xpFromMessage, timestamp: message.createdTimestamp }, this.bot.config.leveling.messageExpiry);

    await this.bot.prisma.guildMember.update({
      where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
      data: {
        xp: calc.xp,
        rank: calc.rank,
        lastMessageTimestamp: message.createdAt,
      },
    });
  }

  /**
   *
   * @param member
   * @param rank
   * @param memberData
   * @returns false if there were permission issues
   */
  async adjustRoles(member: GuildMember, rank: number, memberData: GuildMemberWithGuildAndLevelingSettings): Promise<boolean> {
    const myPosition = member.guild.members.me.roles.highest.position;
    if (!member.guild.members.me.permissions.has("ManageRoles")) {
      await guildWarning({
        guild: member.guild,
        settings: memberData.Guild,
        message: "One of my roles needs to be given the `Manage Roles` permission. I can't currently give out leveling roles because I don't have that permission.",
        severity: "High",
      });

      return false;
    }

    let lackingPermissions = false;
    const ensurePerms =
      <R>(fn: (role: R) => boolean) =>
      (role: R): boolean => {
        if (!fn(role)) lackingPermissions = true;
        return fn(role);
      };

    let { levelingRoles } = memberData.Guild;
    const guildRoles = await member.guild.roles.fetch();

    // Delete deleted roles
    for (const levelingRole of levelingRoles) {
      if (!guildRoles.has(levelingRole.id)) {
        levelingRoles = levelingRoles.filter((r) => r.id !== levelingRole.id);
        await this.bot.prisma.levelingRole.delete({ where: { id: levelingRole.id } });
      }
    }

    if (memberData.Guild.levelingRoleStacking) {
      const earnedRoles = levelingRoles.filter((role) => role.rank <= rank);
      // prettier-ignore
      const missingRoles = earnedRoles
        .filter((role) => !member.roles.cache.has(role.id))
        .filter(ensurePerms((role) => guildRoles.get(role.id).position < myPosition));
      // prettier-ignore
      const excessRoles = member.roles.cache
        .filter((role) => levelingRoles.find((r) => r.id === role.id))
        .filter((role) => !earnedRoles.find((r) => r.id === role.id))
        .filter(ensurePerms((role) => role.position < myPosition));

      // prettier-ignore
      if (missingRoles.length > 0) await member.roles.add(missingRoles.map((r) => r.id), "Leveling");
      if (excessRoles.size > 0) await member.roles.remove(excessRoles, "Syncing leveling");
    } else {
      // prettier-ignore
      const currentRole = levelingRoles
        .sort((role1, role2) => role1.rank - role2.rank)
        .findLast(role => role.rank <= rank);

      // short circuit if currentRole is undefined
      if (currentRole && guildRoles.get(currentRole.id).position > myPosition) return false;

      // prettier-ignore
      const excessRoles = member.roles.cache
        .filter((role) => levelingRoles.find((r) => r.id === role.id))
        .filter((role) => !currentRole || (role.id !== currentRole.id))
        .filter(ensurePerms((role) => role.position < myPosition));

      // short circuit if currentRole is undefined
      if (currentRole && !member.roles.cache.has(currentRole.id)) await member.roles.add(currentRole.id, "Leveling");
      if (excessRoles.size > 0) await member.roles.remove(excessRoles, "Syncing leveling");
    }

    return !lackingPermissions;
  }

  calculateXpForMessage(message: Message): number {
    const length = message.content.replace(/ +/g, "").length;
    // prettier-ignore
    const lengthMutliplier = 
      length <= 10 
      ? 0.2 
      : length <= this.bot.config.leveling.idealMessageLength 
        ? Math.log2(length + 1) / Math.log2(this.bot.config.leveling.idealMessageLength + 1) 
        : 1;

    // todo add more multipliers
    const finalMultiplier = Math.min(lengthMutliplier);

    return this.bot.config.leveling.maxXpPerMessage * finalMultiplier;
  }
}
