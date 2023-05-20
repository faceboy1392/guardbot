import {
  ApplicationCommandData,
  ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  MessageContextMenuCommandInteraction,
  PermissionResolvable,
  UserContextMenuCommandInteraction,
} from "discord.js";
import Context from "../util/Context";
import Bob from "./Bot";

/**
 * Stores all the executable functionality of the command's implementation, keeping it separate from static data.
 *
 * Needs an `execute()` method.
 */
export abstract class Executable {
  constructor() {}
  /**
   *
   * @param bob The bobject
   * @param interaction The interaction this command is responding to
   * @param settings The guild's settings, null if used in a dm
   */
  async execute(bob: Bob, interaction: CommandInteraction, ctx: Context): Promise<any> {
    interaction.reply({ content: "command broke 💀", ephemeral: true });
  }
}

interface Common {
  /**
   * The structure of this application command.
   */
  structure: ApplicationCommandData;
  perms: {
    /**
     * Whether or not to require the user to have the permissions defined in structure, regardless of what admins set the permissions of this command to.
     *
     * `false` = let admins change it how they want
     *
     * `true` = override what admins choose
     *
     * ! NOT IMPLEMENTED YET
     */
    //mandatory: boolean;
    /**
     * Whether the user has to be the server owner to run this
     */
    owner?: boolean;
    /**
     * Whether the user has to be a manager to run this
     */
    manager?: boolean;
    /**
     * Permissions bob has to have to run this command.
     */
    bot: PermissionResolvable | PermissionResolvable[];
  };
  /**
   * Whether to disable the ability to use this command. Used in interactionCreate.
   */
  disable?: boolean;
  /**
   * Whether to have the command handler skip this command when registering / updating commands.`true` means this command will be skipped.
   */
  ignore?: boolean;

  __dirname: string;
}

interface GlobalCommandData {
  /**
   * Scope it globally. All servers have access to this command.
   */
  scope: "global";
  /**
   * Should be null in global scope.
   */
  guildId?: null;
}

interface GuildCommandData {
  /**
   * Scope it to a specific guild. Only that guild has access to this command. Must provide `.guildId` to use this scope.
   */
  scope: "guild";
  /**
   * The id for which guild to scope this command to.
   */
  guildId: string;
}

export type CommandData = Common & (GlobalCommandData | GuildCommandData);

export const CommandType = ApplicationCommandType;
export const OptionType = ApplicationCommandOptionType;

export type ChatInput = ChatInputCommandInteraction;
export type UserContext = UserContextMenuCommandInteraction;
export type MessageContext = MessageContextMenuCommandInteraction;
export type Ctx = Context;

/**
 * A standard application command for bob, containing both the static data and implementation of the command.
 */
export interface Command {
  name: string;
  data: CommandData;
  Impl: new () => Executable;
  autocomplete?: (
    i: AutocompleteInteraction
  ) => Promise<ApplicationCommandOptionChoiceData[]> | ApplicationCommandOptionChoiceData[];
}
