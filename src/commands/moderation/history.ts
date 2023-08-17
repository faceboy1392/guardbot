import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import Paginate from "../../util/Paginate";
import { EmbedBuilder, blockQuote, escapeMarkdown } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "history",
    description: "View the moderation history of a particular user.",
    type: CommandType.ChatInput,
    options: [
      {
        name: "user",
        description: "any server member, you can also paste a user id here",
        type: OptionType.User,
        required: true,
      },
    ],
    dmPermission: false,
  },
  scope: "global",
  perms: {
    bot: ["ViewAuditLog"],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: ChatInput, ctx: Ctx) {
    const target = await i.client.users.fetch(i.options.getUser("user").id);
    let isInGuild;
    try {
      await i.guild.members.fetch(target.id);
      isInGuild = true;
    } catch (err) {
      isInGuild = false;
    }
    const records = await bot.prisma.infraction.findMany({ where: { guildMemberUserId: target.id, guildMemberGuildId: i.guildId }, orderBy: { date: "asc" } });
    if (records.length === 0) return i.reply({ content: "This user has no infraction history!", ephemeral: true });
    const items = records.map((r, i) => `\\> [${i + 1}] <t:${Math.round(r.date.getTime() / 1000)}:f> - ${r.description}`);
    await Paginate.expandable({
      interaction: i,
      items,
      itemsPerPage: 10,
      embed: new EmbedBuilder()
        .setTitle("Infraction history")
        .setColor(target.hexAccentColor ?? bot.colors.Invis)
        .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
        .setDescription(`This user is ${isInGuild ? "currently" : "**not** still"} in the server.`)
        .setFooter({ text: "Only includes actions performed through my commands" }),
      ephemeral: false,
      idle: 10 * 60_000,
      selectMenuPreview: (index) => {
        const record = records[index];
        return `> [${index + 1}] ${record.type} by \`${escapeMarkdown(record.moderatorTag)}\` for ${record.reason ?? "no reason"}`;
      },
      expand: (index) => {
        const record = records[index];
        return new EmbedBuilder()
          .setTitle("Infraction details")
          .setColor(target.hexAccentColor ?? bot.colors.Invis)
          .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
          .setDescription(
            `**Action**\n` +
              `\\> ${ctx.capitalize(record.type)}\n` +
              `**Target**\n` +
              `\\> Tag: ${escapeMarkdown(target.tag)}\n` +
              `\\> Id: ${escapeMarkdown(target.id)}\n` +
              `**Moderator responsible**\n` +
              `\\> Tag: ${escapeMarkdown(record.moderatorTag)}\n` +
              `\\> Id: \`${record.moderatorId}\`\n` +
              `**Reason**\n` +
              `${blockQuote(record.reason ?? "None")}`
          )
          .setTimestamp(record.date);
      },
    });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
