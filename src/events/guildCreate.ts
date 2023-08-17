import { ChannelType, EmbedBuilder, Events, Guild, OverwriteType } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";

const data: EventData = {
  name: Events.GuildCreate,
  once: false,
};

class Impl extends EventExecutable {
  async execute(bot: Bot, guild: Guild) {
    const settings = await bot.prisma.guild.upsert({ where: { id: guild.id }, create: { id: guild.id }, update: {} });
    if (guild.members.me.nickname !== settings.nickname && guild.members.me.permissions.has("ChangeNickname"))
        await guild.members.me.setNickname(settings.nickname);
    if (!settings.logChannelId) {
      if (guild.members.me.permissions.has("ManageChannels")) {
        const logChannel = await guild.channels.create({
          name: "bob-logs",
          type: ChannelType.GuildText,
          position: 0,
          permissionOverwrites: [{ deny: "ViewChannel", type: OverwriteType.Role, id: guild.roles.everyone }],
          reason: "log channel",
        });
        if (bot.client.application.partial) await bot.client.application.fetch();
        const commands = await bot.client.application.commands.fetch();
        const logChannelCommand = commands.find((c) => c.name === "logchannel");
        const logsCommand = commands.find((c) => c.name === "logs");
        logChannel.send({
          content: [
            "# Why is this channel here?",
            "I created it automatically when I joined the server. This is the *only* time I will make any change to the server without being prompted to.",
            "Note that this is a private channel that only server administrators can view by default.",
            "## Okay, but what is the purpose of this channel?",
            "If any changes are made to my settings or there are any issues with my configuration, I will send those logs here. More or less an audit log for my settings. This is **NOT** for moderation logs.",
            "## Can I delete this channel?",
            "If you want, absolutely. Deleting it won't break anything. *However,* I recommend you finish reading this first.",
            `\nYou can set my logs to be sent to a different channel with the </logchannel set:${logChannelCommand?.id}> command. This is best if you already have a #bot-logs channel of some kind. I highly recommend you always have a log channel set, though it isn't required for me to function.`,
            "You can also just modify this channel in any way you want as long as you don't remove my access to the channel.",
            "## But can't logs that are sent as messages just get deleted?",
            `Unfortunately, yes. *However,* you can also use the </logs:${logsCommand.id}> command to view these logs. To prevent malicious activity, the only way to delete any of these logs manually is to fully reset the server's settings with \`/reset\` (be careful with that command).`,
            "## Other notes",
            `You can view my privacy policy at ${bot.config.website.privacy}. Note that my developer sucks at keeping that website up to date.`,
            `You can join my support server at ${bot.config.server}. If you have *any* questions about me, feel free to ask them there.`,
          ].join("\n"),
          flags: "SuppressEmbeds",
        });
        await bot.prisma.guild.update({ where: { id: guild.id }, data: { logChannelId: logChannel.id } });
      }
    }
  }
}

export default { name: data.name, once: data.once, Impl };
