import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { LevelingRole, NoXpChannel, NoXpRole, Guild as PrismaGuild } from "@prisma/client";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, EmbedBuilder, GuildBasedChannel, ModalBuilder, Role, RoleSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

type SettingsWithLeveling = PrismaGuild & {
  levelingRoles: LevelingRole[];
  noXpChannels: NoXpChannel[];
  noXpRoles: NoXpRole[];
};

// Static data about the command
const data: CommandData = {
  structure: {
    name: "leveling",
    description: "_",
    type: CommandType.ChatInput,
    options: [
      {
        name: "help",
        description: "Learn how my leveling system works.",
        type: OptionType.Subcommand,
      },
      {
        name: "enable",
        description: "Enable leveling. You will have to select leveling roles to use for this.",
        type: OptionType.Subcommand,
      },
      {
        name: "disable",
        description: "Disable leveling. Leveling settings and roles will not be reset.",
        type: OptionType.Subcommand,
      },
      {
        name: "modify",
        description: "Modify the leveling settings. This will give you a little menu to interact with.",
        type: OptionType.Subcommand,
      },
      {
        name: "reset",
        description: "Reset everyone's levels. Only the server owner can do this, and this is irreversable.",
        type: OptionType.Subcommand,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: "Administrator",
  },
  scope: "global",
  perms: {
    bot: ["ManageRoles"],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: ChatInput, ctx: Ctx) {
    const subcommand = i.options.getSubcommand();
    const settings = ctx!.settings;

    if (subcommand === "help") this.help(bot, i, ctx, settings);
    else if (subcommand === "enable") this.enable(bot, i, ctx, settings);
    else if (subcommand === "disable") this.disable(bot, i, ctx, settings);
    else if (subcommand === "modify") this.modify(bot, i, ctx); // it has to fetch settings with leevling related fields
    else if (subcommand === "reset") this.reset(bot, i, ctx, settings);
  }

  async help(bot: Bot, i: ChatInput, ctx: Ctx, settings: PrismaGuild) {
    ctx.re("this subcommand is incomplete");
  }

  async enable(bot: Bot, i: ChatInput, ctx: Ctx, settings: PrismaGuild) {
    await bot.prisma.guild.update({ where: { id: i.guildId }, data: { levelingEnabled: true } });
    ctx.logAction({ message: "Enabled leveling system", userId: i.user.id, data: { color: bot.colors.Lime } });
    ctx.re(
      new EmbedBuilder()
        .setTitle("Leveling enabled")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: "@" + i.user.username, iconURL: i.user.displayAvatarURL() })
        .setTimestamp(),
      "visible"
    );
  }

  async disable(bot: Bot, i: ChatInput, ctx: Ctx, settings: PrismaGuild) {
    await bot.prisma.guild.update({ where: { id: i.guildId }, data: { levelingEnabled: false } });
    ctx.logAction({ message: "Disabled leveling system", userId: i.user.id, data: { color: bot.colors.Orange } });
    ctx.re(
      new EmbedBuilder()
        .setTitle("Leveling disabled")
        .setColor(bot.colors.Orange)
        .setAuthor({ name: "@" + i.user.username, iconURL: i.user.displayAvatarURL() })
        .setTimestamp(),
      "visible"
    );
  }

  async modify(bot: Bot, i: ChatInput, ctx: Ctx) {
    const settings = await bot.prisma.guild.findUnique({
      where: { id: i.guildId },
      include: {
        levelingRoles: { orderBy: { rank: "asc" } },
        noXpChannels: true,
        noXpRoles: true,
      },
    });

    const levelingRoles: Role[] = [];
    const noXpRoles: Role[] = [];
    const noXpChannels: GuildBasedChannel[] = [];

    const deletedLevelingRoles: string[] = [];
    const deletedNoXpRoles: string[] = []
    const deletedNoXpChannels: string[] = []

    const guildRoles = await i.guild.roles.fetch();
    const guildChannels = i.guild.channels.cache;

    for (const { id } of settings.levelingRoles) {
      if (!guildRoles.has(id)) deletedLevelingRoles.push(id);
      else levelingRoles.push(guildRoles.get(id));
    }
    for (const { id } of settings.noXpRoles) {
      if (!guildRoles.has(id)) deletedNoXpRoles.push(id);
      else noXpRoles.push(guildRoles.get(id));
    }
    for (const { id } of settings.noXpChannels) {
      if (!guildChannels.has(id)) deletedNoXpChannels.push(id);
      else noXpChannels.push(guildChannels.get(id));
    }
    
    const values = {
      leveling: settings.levelingEnabled,
      stacking: settings.levelingRoleStacking,
      persist: settings.persistLevelingRoles,
      xpMultiplier: settings.xpMultiplier,
      exponentialFactor: settings.levelingExponentialFactor,
      levelingRoles,
      noXpChannels,
      noXpRoles
    };

    //* Message payload stuff
    const embed = new EmbedBuilder()
      .setTitle("Adjust Leveling Settings")
      .setColor(bot.colors.White)
      .setFooter({ text: "If the buttons/menus stop responding, you might want to try using the command again." });
    const components = [
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setLabel(`Leveling ${values.leveling ? "enabled" : "disabled"}`)
          .setStyle(values.leveling ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setCustomId("leveling"),
        new ButtonBuilder()
          .setLabel(`Stacking ${values.stacking ? "enabled" : "disabled"}`)
          .setStyle(values.stacking ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setCustomId("stacking"),
        new ButtonBuilder()
          .setLabel(`Persist ${values.persist ? "enabled" : "disabled"}`)
          .setStyle(values.persist ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setCustomId("persist"),
        new ButtonBuilder().setLabel("More info").setStyle(ButtonStyle.Link).setURL("").setDisabled(true) //TODO make website
      ),
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setLabel(`XP multiplier: ${values.xpMultiplier.toFixed(2)}x`)
          .setStyle(ButtonStyle.Primary)
          .setCustomId("multiplier"),
        new ButtonBuilder()
          .setLabel(`Exponential scale factor*: ${values.exponentialFactor.toFixed(2)}x`)
          .setStyle(ButtonStyle.Primary)
          .setCustomId("exponential"),
        new ButtonBuilder().setLabel("Save changes").setStyle(ButtonStyle.Success).setEmoji("💾").setCustomId("save"),
        new ButtonBuilder().setLabel("Cancel changes").setStyle(ButtonStyle.Danger).setEmoji("❌").setCustomId("cancel")
      ),
      new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(new RoleSelectMenuBuilder()),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(new ChannelSelectMenuBuilder()),
      new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(new RoleSelectMenuBuilder()),

      //! i hate discord i realized that i cant have preset values for non-text select menus
    ];
  }

  async reset(bot: Bot, i: ChatInput, ctx: Ctx, settings: PrismaGuild) {
    ctx.assert(i.user.id === i.guild.ownerId, "Only the server owner can do this, as it permanently erases everyone's XP.");

    const modal = new ModalBuilder()
      .setTitle("Are you sure?")
      .setCustomId("modal")
      .setComponents(
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setLabel("Input the server name to confirm")
            .setCustomId("confirm")
            .setStyle(TextInputStyle.Short)
            .setMinLength(i.guild.name.length)
            .setMaxLength(i.guild.name.length)
            .setRequired(true)
            .setPlaceholder("This CANNOT be undone.")
        )
      );

    await i.showModal(modal);
    const submit = await i.awaitModalSubmit({ time: 5 * 60_000 });

    const input = submit.components[0].components[0].value;
    if (input.toLowerCase() !== i.guild.name.toLowerCase()) return submit.reply({ content: "You didn't properly input the server name to confirm.", ephemeral: true });

    await bot.prisma.guildMember.updateMany({ where: { guildId: i.guildId }, data: { xp: 0, rank: 0 } });
    await ctx.logAction({ message: "RESET ALL XP", userId: i.user.id, data: { color: bot.colors.Black } });
    submit.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Full XP reset")
          .setColor(bot.colors.Black)
          .setAuthor({ name: "@" + i.user.username, iconURL: i.user.displayAvatarURL() })
          .setDescription("Everyone's XP in this server has been fully reset.")
          .setFooter({ text: "Irreversable" })
          .setTimestamp(),
      ],
    });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
