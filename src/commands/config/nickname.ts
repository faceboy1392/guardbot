import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { escapeMarkdown } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "nickname",
    description: "_",
    type: CommandType.ChatInput,
    options: [
      {
        name: "new",
        description: "1-32 characters",
        type: OptionType.String,
        required: true,
        minLength: 1,
        maxLength: 32,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: "ManageGuild",
  },
  scope: "global",
  perms: {
    bot: ["ChangeNickname"],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: ChatInput, ctx: Ctx) {
    const nick = i.options.getString("new");
    await i.guild.members.me.setNickname(nick);
    await bot.prisma.guild.upsert({
      where: { id: i.guildId },
      create: { id: i.guildId, nickname: nick },
      update: { nickname: nick },
    });
    i.reply("k, done");
    ctx.logAction({ message: `Changed nickname to \`${escapeMarkdown(nick)}\``, userId: i.user.id });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
