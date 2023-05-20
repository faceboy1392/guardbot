import { ApplicationCommand, ApplicationCommandData, ApplicationCommandManager, Client, Collection } from "discord.js";
import { Command } from "../classes/Command";
import Bot from "../classes/Bot";
import logger from "../logger";

/**
 * get it? command? handler? commandler? hahaha *what am i doing with my life*
 *
 * a class that simplifies CRUD operations with slash commands
 */

export default class Commandler {
  bob: Bot;
  client: Client;
  commands: Collection<string, Command>;
  manager: ApplicationCommandManager;
  registered: Collection<string, ApplicationCommand>;

  /**
   * Must call either .startup() or .reload() after instantiating this
   * @param bob
   */
  constructor(bob: Bot) {
    this.bob = bob;
    this.client = bob.client;
    this.commands = bob.commands;
  }

  /**
   * Call this right after creating a new instance or when doing anything anything that needs an up-to-date registered command collection
   */
  async reload() {
    if (this.client.application.partial) await this.client.application.fetch();
    this.manager = this.client.application.commands;
    this.registered = await this.manager.fetch();
  }

  /**
   * call this ONCE
   */
  async startup() {
    await this.reload();
    const { commands, registered } = this;

    for (const [name, cmd] of commands) {
      if (cmd.data.ignore) continue;
      let appcmd = this.find(name);

      // local exists, registered doesn't
      if (!appcmd) {
        await this.create(cmd);
        continue;
      }

      // global exists when it should be guild
      if (cmd.data.scope === "guild") {
        await this.deleteNonexistent(appcmd);
        await this.reload();
        await this.create(cmd);
      }

      if (!("options" in cmd.data.structure) || !cmd.data.structure.options)
        cmd.data.structure = {
          options: [],
          ...cmd.data.structure,
        } as ApplicationCommandData;

      if (!appcmd.equals(cmd.data.structure)) {
        logger.debug(`Updating cmd ${name}...`);
        await this.update(cmd);
      }
    }

    for (const [, appcmd] of registered) {
      if (!commands.has(appcmd.name)) {
        await this.deleteNonexistent(appcmd);
      }
    }

    for (const [, guild] of this.client.guilds.cache) {
      const guildCmds = await guild.commands.fetch();
      for (const [, guildCmd] of guildCmds) {
        const cmd = commands.get(guildCmd.name);
        if (!cmd) await this.deleteNonexistent(guildCmd);
        else {
          if (!("options" in cmd.data.structure) || !cmd.data.structure.options)
            cmd.data.structure = {
              options: [],
              ...cmd.data.structure,
            } as ApplicationCommandData;
          if (!guildCmd.equals(cmd.data.structure)) await this.update(cmd);
        }
      }
    }
  }

  /**
   * Does not work with guild-specific commands.
   * @param name a valid application command name
   * @returns an `ApplicationCommand` or `null` if not found
   */
  find(name: string): ApplicationCommand | null {
    return this.registered.find((c) => c.name === name) || null;
  }

  /**
   * Registers an application command. If the command already exists, it returns that registered command.
   * @param command can be either global or guild-scoped
   * @returns the created `ApplicationCommand`, or `null` if the command is guild-scoped but the guild cannot be found
   */
  async create(command: Command): Promise<ApplicationCommand | null> {
    const existing = this.find(command.name);
    if (existing) return existing;

    let created;
    if (command.data.scope === "global") {
      created = await this.manager.create(command.data.structure);
      logger.info(`Created App Command: (${created.name})`);
    } else {
      const guild = this.client.guilds.cache.get(command.data.guildId);
      if (!guild) return null; // doesn't throw an error because sharding could mean it is not in the guild

      const commands = await guild.commands.fetch();
      const existing = commands.find((c) => c.name === command.name);
      if (existing) return existing;

      created = await guild.commands.create(command.data.structure);
      logger.info(`Created App Command: (${created.name}) in guild: (${guild.id})`);
    }

    this.reload();
    return created ?? null;
  }

  /**
   * Edits an application command's static registered structure.
   * @param command an instance of a subclass of the `Command` class
   * @returns the editted command or `null` if it or its specific guild (if applicable) does not exist
   */
  async update(command: Command): Promise<ApplicationCommand | null> {
    let updated;
    if (command.data.scope === "global") {
      const existing = this.find(command.name);
      if (!existing) return null;

      updated = await this.manager.edit(existing, command.data.structure);
      logger.info(`Updated App Command: (${command.name})`);
    } else {
      const guild = this.client.guilds.cache.get(command.data.guildId);
      if (!guild) return null; // doesn't throw an error because sharding could mean it is not in the guild

      const commands = await guild.commands.fetch();
      const existing = commands.find((cmd) => cmd.name === command.name);
      if (!existing) return null;

      updated = await guild.commands.edit(existing, command.data.structure);
      logger.info(`Updated App Command: (${command.name}) in guild: (${guild.id})`);
    }

    this.reload();
    return updated ?? null;
  }

  /**
   * Unregisters an application command
   * @param command
   * @returns false if it could not find a command to remove
   */
  async delete(command: Command): Promise<boolean> {
    if (command.data.scope === "global") {
      const existing = this.find(command.name);
      if (!existing) return false;

      await this.manager.delete(existing);
      logger.info(`Deleted App Command: (${command.name})`);
    } else {
      const guild = this.client.guilds.cache.get(command.data.guildId);
      if (!guild) return null; // doesn't throw an error because sharding could mean it is not in the guild

      const commands = await guild.commands.fetch();
      const existing = commands.find((cmd) => cmd.name === command.name);
      if (!existing) return false;

      await guild.commands.delete(existing);
      logger.info(`Deleted App Command: (${command.name}) in guild: (${guild.id})`);
    }

    this.reload();
    return true;
  }

  /**
   * Deletes a command by name
   * @param appcmd the application command
   * @returns true if succeeded
   */
  async deleteNonexistent(appcmd: ApplicationCommand): Promise<boolean> {
    if (!appcmd.guildId) {
      await this.manager.delete(appcmd);
      logger.info(`Deleted App Command: (${appcmd.name})`);
    } else {
      const guild = this.client.guilds.cache.get(appcmd.guildId);
      if (!guild) return false;

      guild.commands.delete(appcmd);
      logger.info(`Deleted App Command: (${appcmd.name}) in guild: (${guild.id})`);
    }

    return true;
  }
}
