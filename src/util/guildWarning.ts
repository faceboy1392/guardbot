import { ChannelType, Guild } from "discord.js";
import { Guild as PrismaGuild } from "@prisma/client";
import bot from "../bot";

export default async function guildWarning(options: { guild: Guild; settings: PrismaGuild; message: string; severity: "Low" | "Medium" | "High" | "Extreme" }) {
  if (options.settings.logChannelId !== null) {
    const logChannel = options.guild.client.channels.cache.get(options.settings.logChannelId);
    if (!logChannel) {
      await bot.prisma.guild.update({ where: { id: options.guild.id }, data: { logChannelId: null } });
    } else {
      // type guard, it should always be GuildText when set with the /logchannel command
      if (logChannel.type === ChannelType.GuildText) {
        if (logChannel.permissionsFor(options.guild.members.me).has("SendMessages") && logChannel.viewable && !options.guild.members.me.isCommunicationDisabled()) {
          logChannel.send(`⚠️ **${options.severity.toUpperCase()} severity warning**\n>>> ${options.message}`);
        }
      }
    }
  }
}
