import { Events } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";

const data: EventData = {
  name: Events.GuildCreate,
  once: false,
};

class Impl extends EventExecutable {
  async execute(bot: Bot, arg: any) {
    console.warn(`Event ${data.name} has no execute body`);
  }
}

export default { name: data.name, once: data.once, Impl };