import { CommandData, CommandType, Ctx, Executable, UserContext } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { EmbedBuilder } from "@discordjs/builders";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "Check perms",
    type: CommandType.User,
    dmPermission: false,
  },
  scope: "global",
  perms: {
    bot: [],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  formatPermissionName(name: string): string {
    let output = "";
    for (const char of name) {
      if (char === char.toUpperCase()) output += " ";
      output += char;
    }
    return output.trim().replace("Guild", "Server");
  }

  async execute(bot: Bot, i: UserContext, ctx: Ctx) {
    let { channel } = i;
    let target = await i.guild.members.fetch(i.targetUser);

    const serverPerms = Object.entries(target.permissions.serialize());
    const channelPerms = Object.entries(target.permissionsIn(channel).serialize());

    const permCount = serverPerms.length;
    let formattedPerms: string[] = ["", ""];
    for (let i = 0; i < permCount; i++) {
      const output = `${serverPerms[i][1] ? "✅" : "❌"} | ${channelPerms[i][1] ? "✅" : "❌"} - ${this.formatPermissionName(serverPerms[i][0])}\n`;
      if (i % permCount < permCount / 2) {
        formattedPerms[0] += output;
      } else {
        formattedPerms[1] += output;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("Permissions")
      .setColor(bot.colors.White)
      .setDescription(`Target: ${target.toString()}\nChannel: ${channel.toString()}\nPermission bitfield: \`${target.permissions.bitfield}\``)
      .addFields(
        {
          name: "⠀",
          value: `📢 | 💬 - Server/Channel\n————————————————\n${formattedPerms[0]}`,
          inline: true,
        },
        {
          name: "⠀",
          value: `📢 | 💬 - Server/Channel\n————————————————\n${formattedPerms[1]}`,
          inline: true,
        }
      );

    i.reply({ embeds: [embed], ephemeral: true });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
