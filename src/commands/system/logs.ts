import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { EmbedBuilder } from "discord.js";
import Paginate from "../../util/Paginate";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "logs",
    description: "View my config logs. These are not moderation logs, they keep track of changes to my settings.",
    type: CommandType.ChatInput,
    options: [
      {
        name: "log_id",
        description: "Optional. Provide a log UUID to immediately find it, id format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
        type: OptionType.String,
        required: false,
        minLength: 36,
        maxLength: 36,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: ["ViewAuditLog"],
  },
  scope: "global",
  perms: {
    bot: [],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: ChatInput, ctx: Ctx) {
    const logId = i.options.getString("log_id")?.trim();
    if (logId) {
      ctx.assert(
        logId.match(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/) !== null,
        "That's not a valid log id! Log ids are in the UUID format, with hexadecimal digits formatted like XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX." +
          "\nFor example, 550e8400-e29b-41d4-a716-446655440000 is an example of a valid UUID. Make sure you aren't missing out the dashes ` - `."
      );

      const log = await bot.prisma.log.findUnique({ where: { id: logId } });

      ctx.assert(log !== null, "That log does not appear to exist! Are you sure you have the right log id?");
      ctx.assert(log.guildId === i.guildId, "That log is from a different server! You have to use this command in the right server if you want to access this log.");

      const embed = new EmbedBuilder()
        .setTitle("Bot log")
        .setColor(bot.colors.White)
        .setDescription(log.message)
        .setFooter({ text: `id: ${log.id}` });

      if (log.userId) {
        const user = await bot.client.users.fetch(log.userId);
        if (user) embed.setAuthor({ name: `@${user.username} | id: ${log.userId}`, iconURL: user.displayAvatarURL() });
      }

      ctx.re(embed);
    } else {
      const logs = await bot.prisma.log.findMany({ where: { guildId: i.guildId } });
      ctx.assert(logs.length > 0, "There are no logs in this server. Note that bot logs can only be deleted by my developer or by fully resetting the server's settings.");

      const embed = new EmbedBuilder().setTitle("Logs").setColor(bot.colors.White);

      await Paginate.expandable({
        interaction: i,
        embed,
        items: logs.map((l, i) => `\\> [${i + 1}] <t:${Math.round(l.timestamp.getTime() / 1000)}:f> - ${l.message}`),
        itemsPerPage: 10,
        selectMenuPreview: (index) => {
          const log = logs[index];
          return `> [${index + 1}] ${log.message}`;
        },
        expand: async (index) => {
          const log = logs[index];
          const embed = new EmbedBuilder()
            .setTitle("Bot log")
            .setColor(bot.colors.White)
            .setDescription(log.message)
            .setFooter({ text: `id: ${log.id}` });

          if (log.userId) {
            const user = await bot.client.users.fetch(log.userId);
            if (user) embed.setAuthor({ name: `@${user.username} | id: ${log.userId}`, iconURL: user.displayAvatarURL() });
          }
          return embed;
        },
        idle: 5 * 60_000,
        ephemeral: true,
      });
    }
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
