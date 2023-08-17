import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { EmbedBuilder, GuildMember, blockQuote, escapeMarkdown } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "ban",
    description: "Ban a user for a specified reason.",
    type: CommandType.ChatInput,
    options: [
      {
        name: "user",
        description: "the user to kick",
        type: OptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "the reason for the kick (1000 characters max)",
        type: OptionType.String,
        maxLength: 1000,
      },
      {
        name: "delete_messages",
        type: OptionType.String,
        description: "how much of the user's recent message history to delete",
        choices: [
          { name: "None", value: "0" },
          { name: "Last hour", value: "3600" },
          { name: "Last 6 hours", value: "21600" },
          { name: "Last 12 hours", value: "43200" },
          { name: "Last 24 hours", value: "86400" },
          { name: "Last 3 days", value: "259200" },
          { name: "Last 7 days", value: "604800" },
        ],
        required: false,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: "BanMembers",
  },
  scope: "global",
  perms: {
    bot: ["BanMembers"],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: ChatInput, ctx: Ctx) {
    const moderator = i.member as GuildMember;
    const target = i.options.getMember("user") as GuildMember; 
    const reason = i.options.getString("reason");
    const guildName = i.guild.name;
    ctx.assert(target.id !== i.client.user.id, "do you are have stupid");
    ctx.assert(target.id !== moderator.id, "why tf would you want to do that");
    ctx.assert(ctx.checkPerms(moderator, target) === 1, ":x: You don't have high enough role(s) to ban that user!");
    ctx.assert(ctx.checkPerms("me", target) === 1, ":x: My role(s) aren't high enough to ban that user, someone needs to give me a higher role so I can do things like that.");
    ctx.assert(target.id !== "718930767740403753", ":x: That's my developer, faceboy, I can't ban him! (yes this is actually him who typed this message that you are reading, I'm not letting my own bot ban me lol)");
    ctx.assert(target.bannable, ":x: I can't ban that user, not sure why.");
    let couldDMUser = true;
    try {
      let embed = new EmbedBuilder()
        .setTitle(`Kicked from ${escapeMarkdown(guildName)}`)
        .setColor(bot.colors.Red)
        .setDescription(`:hammer: You have been *banned* from **${escapeMarkdown(guildName)}** by *${escapeMarkdown(moderator.user.tag)}*` + (reason ? ` for the following reason:\n${blockQuote(reason)}` : ""))
        .setFooter({ text: "sorry, I'm just the messenger here" })
        .setTimestamp();
      if (i.guild.iconURL()) embed = embed.setThumbnail(i.guild.iconURL());
      await target.send({ embeds: [embed] });
    } catch (err) {
      couldDMUser = false;
    }
    const seconds = parseInt(i.options.getString("delete_messages") || "0");
    try {
      await target.ban({
        reason: `'/ban' command performed by ${moderator.user.tag} (id: ${moderator.id}). Listed reason: ${reason ?? "N/A"}`,
        deleteMessageSeconds: seconds,
      });
    } catch (err) {
      ctx.re(":warning::interrobang: Sorry, I got an error trying to ban that user. I have no idea why.");
      return bot.log.error(err);
    }
    const embed = new EmbedBuilder()
      .setColor(bot.colors.Orange)
      .setAuthor({ name: moderator.user.tag, iconURL: moderator.displayAvatarURL() })
      .setDescription(`Banned \`${target.user.tag}\`` + (reason ? ` for:\n${blockQuote(reason)}` : ""))
      .setFooter({ text: "User banned" })
      .setTimestamp();
    ctx.re(embed, "visible");
    ctx.moderationLog({
      target,
      moderator,
      action: "ban",
      reason,
      color: "Orange",
      fields: [
        { name: "Could DM user", value: couldDMUser ? "yes" : "no", inline: false },
        { name: "Messages deleted", value: `${seconds / 3600} hours`, inline: false },
      ],
    });
    await bot.prisma.infraction.create({
      data: {
        GuildMember: {
          connectOrCreate: {
            where: {
              userId_guildId: {
                userId: target.id,
                guildId: i.guildId,
              },
            },
            create: {
              User: {
                connectOrCreate: {
                  where: {
                    id: target.id,
                  },
                  create: {
                    id: target.id,
                  },
                },
              },
              Guild: {
                connectOrCreate: {
                  where: {
                    id: i.guildId,
                  },
                  create: {
                    id: i.guildId,
                  },
                },
              },
            },
          },
        },
        type: "BAN",
        reason,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag,
        customData: {
          hoursOfMessagesDeleted: seconds / 3600,
        },
        description: `Banned by \`${escapeMarkdown(moderator.user.tag)}\`${reason ? ` for the reason: ${reason.split("\n").join("     ")}` : ", no reason provided"}`
      },
    });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
