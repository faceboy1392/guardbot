import { ChatInput, CommandData, CommandType, Ctx, Executable, UserContext, } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { EmbedBuilder } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "Get avatar",
    type: CommandType.User,
  },
  scope: "global",
  perms: {
    bot: [],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: UserContext, ctx: Ctx) {
    const target = await i.guild.members.fetch(i.targetUser);
    const embed = new EmbedBuilder()
      .setTitle(`${target.displayName}'s avatar`)
      .setDescription(`[\[Link to avatar\]](${target.displayAvatarURL({ size: 4096 })})`)
      .setColor(target.displayHexColor || bot.colors.White)
      .setImage(target.displayAvatarURL({ size: 4096 }));
    i.reply({ embeds: [embed], ephemeral: true });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };