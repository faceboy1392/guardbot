import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { Channel, ChannelType } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "logchannel",
    description: "Set or change the log channel in this server.",
    type: CommandType.ChatInput,
    options: [
      {
        name: "view",
        description: "Find the current log channel.",
        type: OptionType.Subcommand,
      },
      {
        name: "set",
        description: "Set a channel for me to send logs to.",
        type: OptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "The channel to send logs to",
            type: OptionType.Channel,
            required: true,
            channelTypes: [ChannelType.GuildText],
          },
        ],
      },
      {
        name: "reset",
        description: "Stop logging to the currently-set channel. The channel won't be deleted.",
        type: OptionType.Subcommand,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: ["Administrator"],
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
    const subcommand = i.options.getSubcommand();
    const existingLogChannel = i.client.channels.cache.get(ctx.settings.logChannelId);

    if (subcommand === "view") await this.view(bot, i, ctx, existingLogChannel);
    else if (subcommand === "set") await this.set(bot, i, ctx, existingLogChannel);
    else if (subcommand === "reset") await this.reset(bot, i, ctx, existingLogChannel);
  }

  async view(bot: Bot, i: ChatInput, ctx: Ctx, existingLogChannel: Channel) {
    ctx.re(existingLogChannel ? `<#${existingLogChannel.id}>` : `There is no log channel currently set. You can set one with </logchannel set:${i.commandId}>`);
  }

  async set(bot: Bot, i: ChatInput, ctx: Ctx, existingLogChannel: Channel) {
    const newChannel = i.client.channels.cache.get(i.options.getChannel("channel").id);
    // shouldn't happen, just for type guarding
    if (newChannel.type !== ChannelType.GuildText) return;
    ctx.assert(newChannel.permissionsFor(i.guild.members.me).has("SendMessages"), "I don't have permissions to send any messages in that channel, so it can't be set as a log channel!");
    ctx.assert(!existingLogChannel || existingLogChannel.id !== newChannel.id, "That channel is already set as the log channel!");

    await bot.prisma.guild.update({ where: { id: i.guildId }, data: { logChannelId: newChannel.id } });
    // this won't actually send it to the channel because it uses the now outdated guild settings fetched at initial command execution
    await ctx.logAction({ message: `Set new log channel <#${newChannel.id}>`, data: { "channel id": newChannel.id, "color": bot.colors.White }, userId: i.user.id });
    ctx.re(ctx.quickEmbed(`New log channel set to ${newChannel}`, "Lime").setTimestamp(), "visible");
  }

  async reset(bot: Bot, i: ChatInput, ctx: Ctx, existingLogChannel: Channel) {
    ctx.assert(existingLogChannel !== null, "There isn't a log channel even set, so how am I supposed to reset it?");

    await ctx.logAction({ message: `Removed log channel`, userId: i.user.id, data: { color: bot.colors.Red } });
    await bot.prisma.guild.update({ where: { id: i.guildId }, data: { logChannelId: null } });
    ctx.re(
      ctx.quickEmbed(
        "The log channel has been removed. I do recommend setting a new channel if you want to keep track of changes made. Note that you can also use the `/logs` command to view all of the same logs that would be sent to the log channel.",
        "Orange"
      ),
      "visible"
    );
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
