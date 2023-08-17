import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { EmbedBuilder, GuildMember, blockQuote, escapeMarkdown } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "kick",
    description: "Kick a user for a specified reason",
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
    ],
    dmPermission: false,
    defaultMemberPermissions: "KickMembers",
  },
  scope: "global",
  perms: {
    bot: ["KickMembers"],
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
    ctx.assert(target.id !== i.client.user.id, "what no");
    ctx.assert(target.id !== moderator.id, "*why*");
    ctx.assert(ctx.checkPerms(moderator, target) === 1, ":x: You don't have high enough role(s) to kick that user!");
    ctx.assert(ctx.checkPerms("me", target) === 1, ":x: My role(s) aren't high enough to kick that user, someone needs to give me a higher role so I can do things like that.");
    ctx.assert(target.id !== "718930767740403753", ":x: That's my developer, faceboy, I can't kick him! (yes this is actually him who typed this message that you are reading, I'm not letting my own bot kick me lol)");
    ctx.assert(target.kickable, ":x: I can't kick that user, not sure why.");
    let couldDMUser = true;
    try {
      let embed = new EmbedBuilder()
        .setTitle(`Kicked from ${escapeMarkdown(guildName)}`)
        .setColor(bot.colors.Red)
        .setDescription(`You have been kicked from **${escapeMarkdown(guildName)}** by *${escapeMarkdown(moderator.user.tag)}*` + (reason ? ` for the following reason:\n${blockQuote(reason)}` : ""))
        .setFooter({ text: "You can still rejoin the server. You are *not* banned." })
        .setTimestamp();
      if (i.guild.iconURL()) embed = embed.setThumbnail(i.guild.iconURL());
      await target.send({ embeds: [embed] });
    } catch (err) {
      couldDMUser = false;
    }
    try {
      await target.kick(`'/kick' command performed by ${moderator.user.tag} (id: ${moderator.id}). Listed reason: ${reason ?? "N/A"}`);
    } catch (err) {
      ctx.re(":warning::interrobang: Sorry, I got an error trying to kick that user. I have no idea why.");
      bot.log.error(err);
    }
    const embed = new EmbedBuilder()
      .setColor(bot.colors.Orange)
      .setAuthor({ name: moderator.user.tag, iconURL: moderator.displayAvatarURL() })
      .setDescription(`Kicked \`${target.user.tag}\`` + (reason ? ` for:\n${blockQuote(reason)}` : ""))
      .setFooter({ text: "User kicked" })
      .setTimestamp();
    ctx.re(embed, "visible");
    ctx.moderationLog({ target, moderator, action: "kick", reason, color: "Orange", fields: [{ name: "Could DM user", value: couldDMUser ? "yes" : "no", inline: false }] });
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
        type: "KICK",
        reason,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag,
        description: `Kicked by \`${escapeMarkdown(moderator.user.tag)}\`${reason ? ` for the reason: ${reason.split("\n").join("     ")}` : ", no reason provided"}`,
      },
    });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
