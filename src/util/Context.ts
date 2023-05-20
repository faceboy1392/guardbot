import { Guild } from "@prisma/client";
import { Interaction } from "discord.js";

export default class Context {
  interaction: Interaction
  settings?: Guild

  constructor(interaction: Interaction, settings?: Guild) {
    this.interaction = interaction;
    this.settings = this.isDM() ? null : settings;
  }

  isDM() {
    return this.interaction.channel.isDMBased();
  }

  isGuild() {
    return !this.isDM();
  }

  async sendEmbed() {
    
  }
}