import { Guild, Log, GuildMember as PrismaGuildMember } from "@prisma/client";
import { ChannelType, Client, CommandInteraction, Embed, EmbedBuilder, EmbedField, GuildMember, escapeMarkdown } from "discord.js";
import Bot from "../classes/Bot";

import util from "util";
import colors from "./colors";
import AssertException from "../classes/AssertException";

export default class Context {
  bot: Bot;
  client: Client;
  interaction: CommandInteraction;
  settings?: Guild;

  constructor(bot: Bot, interaction: CommandInteraction, settings?: Guild) {
    this.bot = bot;
    this.client = interaction.client;
    this.interaction = interaction;
    this.settings = this.isDM() ? null : settings;
  }

  isDM() {
    return this.interaction.channel.isDMBased();
  }

  isGuild() {
    return !this.isDM();
  }

  async moderationLog(options: { target: GuildMember; moderator: GuildMember; action: string; reason?: string; color?: keyof typeof colors; fields?: EmbedField[] }) {
    if (this.isDM()) throw Error(`Context#moderationLog() in a DM (action: ${options.action})`);

    options.reason ??= "No reason has been specified.";
    options.color ??= "White";

    if (this.settings.logChannelId) {
      const channel = this.client.channels.cache.get(this.settings.logChannelId);
      if (!channel || !channel.isTextBased()) {
        await this.bot.prisma.guild.update({ where: { id: this.interaction.guildId }, data: { logChannelId: null } });
        return;
      }
      if (channel.isDMBased()) throw Error("Unreachable type guard");
      if (!channel.permissionsFor(channel.guild.members.me).has("SendMessages")) return;
      if (channel.guild.members.me.isCommunicationDisabled()) return;

      let embed = new EmbedBuilder()
        .setTitle(this.capitalize(options.action))
        .setColor(colors[options.color])
        .setAuthor({ name: options.target.user.tag, iconURL: options.target.displayAvatarURL() })
        .setDescription(
          `**Target**\n> ${options.target.toString()} - \`${options.target.id}\`\n` +
            `**Moderator responsible**\n> ${escapeMarkdown(options.moderator.toString())} - \`${options.target.id}\`\n` +
            `**Reason**\n\n${options.reason}`
        )
        .setFooter({ text: "Moderation action log" })
        .setTimestamp();
      if (options.fields) embed = embed.setFields(options.fields);

      channel.send({ embeds: [embed] });
    }
  }

  async re(content: string | Embed | EmbedBuilder | (Embed | EmbedBuilder)[], visibility: "ephemeral" | "visible" = "ephemeral") {
    const ephemeral = visibility === "ephemeral" ? true : false;
    if (typeof content === "string") return this.interaction.reply({ content, ephemeral });
    if (content instanceof Embed || content instanceof EmbedBuilder) return this.interaction.reply({ embeds: [content], ephemeral });
    if (Array.isArray(content)) {
      return this.interaction.reply({ embeds: content, ephemeral });
    }
  }

  /**
   * Checks a condition, and if that condition is false, replies with the provided `message` and throws AssertException.
   * @param condition The condition to check for. If `true`, nothing happens.
   * @param message The message to send if the condition is false.
   * @param options
   */
  assert(condition: boolean, message: string, options: { ephemeral: boolean; embed?: Embed | EmbedBuilder; followUp?: boolean } = { ephemeral: true }): asserts condition {
    if (condition) return;
    if (this.interaction.isRepliable())
      this.interaction[!options.followUp ? "reply" : "followUp"]({
        content: message || undefined,
        embeds: options.embed ? [options.embed] : undefined,
        ephemeral: options.ephemeral || true,
      });
    throw new AssertException();
  }

  /**
   * Throws an AssertException if the command user is not the dev
   */
  devOnly(message?: string | null): void {
    if (this.interaction.user.id !== this.bot.config.owner.id) {
      if (message === undefined) this.interaction.reply({ content: "This command is currently only available to my developer.", ephemeral: true });
      else if (typeof message === "string" && message.length > 0) this.interaction.reply({ content: message, ephemeral: true });
      // don't reply if the message is `null`, it'll just show a client-side error
      throw new AssertException();
    }
  }

  /**
   * returns 1 if the first member's perms are higher in position, -1 if the second is higher, 0 if they are the same
   */
  checkPerms(member1: GuildMember | "me", member2: GuildMember) {
    if (member1 === "me") member1 = this.interaction.guild.members.me;
    if (this.interaction.guild.ownerId === member1.id) return 1;
    if (this.interaction.guild.ownerId === member2.id) return -1;
    const pos1 = member1.roles.highest.position;
    const pos2 = member2.roles.highest.position;
    if (pos1 > pos2) return 1;
    else if (pos2 > pos1) return -1;
    else return 0;
  }

  quickEmbed(description: string, color: keyof typeof colors = "Invis") {
    return new EmbedBuilder().setDescription(description).setColor(colors[color]);
  }

  modularString(strings: ([string, boolean?] | string)[]): string {
    let filtered = strings.filter((s) => s[1] ?? true);
    return filtered.join(" ");
  }

  pause = util.promisify((a: number, f: Function) => setTimeout(f, a));

  rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  trim(str: string, max: number = 2000): string {
    return str.length > max - 3 ? `${str.slice(0, max - 3)}[…]` : str;
  }

  capitalize(txt: string): string {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  }

  async getGuildMemberFromDatabase(id: string): Promise<PrismaGuildMember> {
    if (!this.isGuild()) throw Error("'Context#getGuildMemberFromDatabase()' called in a dm");
    const userId = id ?? this.interaction.user.id,
      guildId = this.interaction.guildId;
    let member = await this.bot.prisma.guildMember.findUnique({
      where: { userId_guildId: { userId, guildId } },
      include: {
        Guild: true,
        User: true,
      },
    });
    if (!member)
      member = await this.bot.prisma.guildMember.create({
        data: {
          User: { connectOrCreate: { where: { id: userId }, create: { id: userId } } },
          Guild: { connectOrCreate: { where: { id: guildId }, create: { id: guildId } } },
        },
        include: {
          Guild: true,
          User: true,
        },
      });
    return member;
  }

  async logAction(options: { message: string; data?: object; userId?: string }): Promise<Log> {
    if (!this.isGuild()) throw Error("'Context#logAction()' called in a dm");

    const log = await this.bot.prisma.log.create({ data: { Guild: { connect: { id: this.interaction.guildId } }, ...options } });

    try {
      if (this.settings.logChannelId !== null) {
        const logChannel = this.client.channels.cache.get(this.settings.logChannelId);
        if (!logChannel) {
          await this.bot.prisma.guild.update({ where: { id: this.interaction.guildId }, data: { logChannelId: null } });
        } else {
          // type guard, it should always be GuildText when set with the /logchannel command
          if (logChannel.type === ChannelType.GuildText) {
            if (logChannel.permissionsFor(this.interaction.guild.members.me).has("SendMessages") && logChannel.viewable && !this.interaction.guild.members.me.isCommunicationDisabled()) {
              // yes i have a ton of nested conditionals fight me i dont care

              const embed = new EmbedBuilder()
                .setDescription(options.message)
                .setFooter({ text: `log id: ${log.id}` })
                .setTimestamp();
              if (options.data && "color" in options.data && typeof options.data.color === "number") {
                try {
                  embed.setColor(options.data.color);
                } catch (err) {}
              } else embed.setColor(this.bot.colors.Invis);
              if (options.userId) {
                const member = await this.interaction.guild.members.fetch(options.userId);
                embed.setAuthor({ name: `@${member.user.username} | ${options.userId}`, iconURL: member.displayAvatarURL() });
              }

              if (options.data) {
                if ("color" in options.data) delete options.data.color;
                for (const [k, v] of Object.entries(options.data)) {
                  embed.addFields({ name: k, value: v, inline: true });
                }
              }

              logChannel.send({ embeds: [embed] });
            }
          }
        }
      }
    } catch (err) {
      this.bot.log.error(err.toString());
    } finally {
      return log;
    }
  }
}
