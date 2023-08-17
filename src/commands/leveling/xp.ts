import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { Prisma, GuildMember as PrismaGuildMember } from "@prisma/client";
import { EmbedBuilder, GuildMember } from "discord.js";
import XpCalculator from "../../util/XpCalculator";

type UpdateFunction = (data: Prisma.Without<Prisma.GuildMemberUpdateInput, Prisma.GuildMemberUncheckedUpdateInput> & Prisma.GuildMemberUncheckedUpdateInput) => Promise<PrismaGuildMember>;

import config from "../../../config.json";
import { GuildMemberWithGuildAndLevelingSettings } from "../../util/LevelingManager";
const { maxXp, maxRank } = config.leveling;

// Static data about the command
const data: CommandData = {
  structure: {
    name: "xp",
    description: "Admin command for manipulating xp and ranks. Use '/leveling' to configure the leveling system.",
    type: CommandType.ChatInput,
    options: [
      {
        name: "view",
        description: "View a user's current xp and rank",
        type: OptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "_",
            type: OptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "set",
        description: "Set the TOTAL xp of a user. This can and will adjust the user's rank",
        type: OptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "_",
            type: OptionType.User,
            required: true,
          },
          {
            name: "amount",
            description: "_",
            type: OptionType.Integer,
            required: true,
            minValue: 0,
            maxValue: maxXp,
          },
        ],
      },
      {
        name: "add",
        description: "Give a user more xp. Enough xp will increase that user's rank",
        type: OptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "_",
            type: OptionType.User,
            required: true,
          },
          {
            name: "amount",
            description: "_",
            type: OptionType.Integer,
            required: true,
            minValue: 0,
            maxValue: maxXp,
          },
        ],
      },
      {
        name: "remove",
        description: "Take xp from a user. This could decrease their rank",
        type: OptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "the unlucky soul",
            type: OptionType.User,
            required: true,
          },
          {
            name: "amount",
            description: "_",
            type: OptionType.Integer,
            required: true,
            minValue: 0,
            maxValue: maxXp,
          },
        ],
      },
      {
        name: "rank",
        description: "_",
        type: OptionType.SubcommandGroup,
        options: [
          {
            name: "set",
            description: "Set the rank of a user",
            type: OptionType.Subcommand,
            options: [
              {
                name: "user",
                description: "_",
                type: OptionType.User,
                required: true,
              },
              {
                name: "amount",
                description: "_",
                type: OptionType.Integer,
                required: true,
                minValue: 0,
                maxValue: maxRank,
              },
            ],
          },
          {
            name: "add",
            description: "Increase the rank of a user",
            type: OptionType.Subcommand,
            options: [
              {
                name: "user",
                description: "_",
                type: OptionType.User,
                required: true,
              },
              {
                name: "amount",
                description: "_",
                type: OptionType.Integer,
                required: true,
                minValue: 0,
                maxValue: maxRank,
              },
            ],
          },
          {
            name: "remove",
            description: "Lower the rank of a user",
            type: OptionType.Subcommand,
            options: [
              {
                name: "user",
                description: "the unlucky soul",
                type: OptionType.User,
                required: true,
              },
              {
                name: "amount",
                description: "_",
                type: OptionType.Integer,
                required: true,
                minValue: 0,
                maxValue: maxRank,
              },
            ],
          },
        ],
      },
      {
        name: "fix_roles",
        description: "Use this if for some reason a user does not have the right leveling roles for their rank",
        type: OptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "_",
            type: OptionType.User,
            required: true,
          },
        ],
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: "Administrator",
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
    const target = await i.guild.members.fetch(i.options.getUser("user").id);
    ctx.assert(target !== null, "no");

    let guildMember: GuildMemberWithGuildAndLevelingSettings = await bot.prisma.guildMember.findUnique({
      where: { userId_guildId: { userId: target.user.id, guildId: i.guildId } },
      include: {
        Guild: {
          include: {
            noXpRoles: true,
            noXpChannels: true,
            levelingRoles: { orderBy: { rank: "asc" } },
          },
        },
        User: true,
      },
    });
    if (!guildMember)
      guildMember = await bot.prisma.guildMember.create({
        data: {
          User: { connectOrCreate: { where: { id: target.user.id }, create: { id: target.user.id } } },
          Guild: { connectOrCreate: { where: { id: i.guildId }, create: { id: i.guildId } } },
        },
        include: {
          Guild: {
            include: {
              noXpRoles: true,
              noXpChannels: true,
              levelingRoles: { orderBy: { rank: "asc" } },
            },
          },
          User: true,
        },
      });

    const subcommand = i.options.getSubcommand(),
      subcommandGroup = i.options.getSubcommandGroup(),
      update: UpdateFunction = async (data: object) => await bot.prisma.guildMember.update({ where: { userId_guildId: { userId: target.user.id, guildId: i.guildId } }, data }),
      args: [Bot, ChatInput, Ctx, GuildMember, GuildMemberWithGuildAndLevelingSettings, UpdateFunction] = [bot, i, ctx, target, guildMember, update];

    if (subcommand === "fix_roles") this.fixRoles(...args);
    else if (!subcommandGroup) {
      if (subcommand === "view") this.view(...args);
      else if (subcommand === "set") this.setXp(...args);
      else if (subcommand === "add") this.addXp(...args);
      else if (subcommand === "remove") this.removeXp(...args);
    } else {
      if (subcommand === "set") this.setRank(...args);
      else if (subcommand === "add") this.addRank(...args);
      else if (subcommand === "remove") this.removeRank(...args);
    }
  }

  async fixRoles(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    const success = await bot.levelingManager.adjustRoles(target, member.rank, member);
    if (!success)
      ctx.re(
        ctx.quickEmbed(
          "I didn't have the necessary permissions to do that! Make sure that at least one of my roles has either `Administrator` or `Manage Roles` enabled, *AND* that my highest role is above all of the leveling roles in the role list. Otherwise, my leveling system ***WILL NOT WORK.***",
          "Red"
        )
      );
    else ctx.re("That user should now have the correct leveling roles.");
  }

  async view(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    const calc = new XpCalculator(member.xp, member.rank);
    ctx.re(
      new EmbedBuilder()
        .setColor(bot.colors.Green)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${calc.rank}\`\n**Extra xp >** \`${calc.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
    );
  }

  async setXp(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    //
    const amount = i.options.getInteger("amount");
    const calc = new XpCalculator(amount, 0).maxXpAndRank(maxXp, maxRank);
    const updated = await update({ xp: calc.xp, rank: calc.rank });
    await bot.levelingManager.adjustRoles(target, calc.rank, member);
    ctx.re(
      new EmbedBuilder()
        .setTitle("Updated xp")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${updated.rank}\`\n**Extra xp >** \`${updated.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
        .setTimestamp()
    );
  }

  async addXp(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    //
    const amount = i.options.getInteger("amount");
    const calc = new XpCalculator(member.xp, member.rank).addXp(amount).maxXpAndRank(maxXp, maxRank);
    const updated = await update({ xp: calc.xp, rank: calc.rank });
    await bot.levelingManager.adjustRoles(target, calc.rank, member);
    ctx.re(
      new EmbedBuilder()
        .setTitle("Updated xp")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${updated.rank}\`\n**Extra xp >** \`${updated.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
        .setTimestamp()
    );
  }

  async removeXp(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    //
    const amount = i.options.getInteger("amount");
    const calc = new XpCalculator(member.xp, member.rank).removeXp(amount).maxXpAndRank(maxXp, maxRank);
    const updated = await update({ xp: calc.xp, rank: calc.rank });
    await bot.levelingManager.adjustRoles(target, calc.rank, member);
    ctx.re(
      new EmbedBuilder()
        .setTitle("Updated xp")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${updated.rank}\`\n**Extra xp >** \`${updated.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
        .setTimestamp()
    );
  }

  async setRank(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    //
    const amount = i.options.getInteger("amount");
    const calc = new XpCalculator(0, amount).maxXpAndRank(maxXp, maxRank);
    const updated = await update({ xp: calc.xp, rank: calc.rank });
    await bot.levelingManager.adjustRoles(target, calc.rank, member);
    ctx.re(
      new EmbedBuilder()
        .setTitle("Updated rank")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${updated.rank}\`\n**Extra xp >** \`${updated.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
        .setTimestamp()
    );
  }

  async addRank(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    //
    const amount = i.options.getInteger("amount");
    const calc = new XpCalculator(member.xp, member.rank).addRank(amount).maxXpAndRank(maxXp, maxRank);
    const updated = await update({ xp: calc.xp, rank: calc.rank });
    await bot.levelingManager.adjustRoles(target, calc.rank, member);
    ctx.re(
      new EmbedBuilder()
        .setTitle("Updated rank")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${updated.rank}\`\n**Extra xp >** \`${updated.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
        .setTimestamp()
    );
  }

  async removeRank(bot: Bot, i: ChatInput, ctx: Ctx, target: GuildMember, member: GuildMemberWithGuildAndLevelingSettings, update: UpdateFunction) {
    //
    const amount = i.options.getInteger("amount");
    const calc = new XpCalculator(member.xp, member.rank).removeRank(amount).maxXpAndRank(maxXp, maxRank);
    const updated = await update({ xp: calc.xp, rank: calc.rank });
    await bot.levelingManager.adjustRoles(target, calc.rank, member);
    ctx.re(
      new EmbedBuilder()
        .setTitle("Updated rank")
        .setColor(bot.colors.Lime)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
        .setDescription(`**Rank >** \`${updated.rank}\`\n**Extra xp >** \`${updated.xp}\`\n**Total xp >** \`${calc.totalXp}\``)
        .setTimestamp()
    );
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
