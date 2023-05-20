import { ActivityType, Client, Events } from "discord.js";
import { EventData, EventExecutable } from "../classes/Event";
import Bot from "../classes/Bot";
import Commandler from "../util/Commandler";

const data: EventData = {
  name: Events.ClientReady,
  once: false,
};

class Impl extends EventExecutable {
  async execute(bot: Bot, client: Client) {
    bot.log.info(`Logged in as ${bot.client.user.tag}`);
    bot.client = client;

    const commandler = new Commandler(bot);
    await commandler.startup();

    client.user.setActivity({ name: "you", type: ActivityType.Watching });

    const knownGuilds = await bot.prisma.guild.findMany();

    for (const [id, guild] of client.guilds.cache) {
      let settings = knownGuilds.find((g) => g.id === id);
      if (!settings) {
        settings = await bot.prisma.guild.create({ data: { id } });
      }
      if (guild.members.me.nickname !== settings.nickname && guild.members.me.permissions.has("ChangeNickname"))
        guild.members.me.setNickname(settings.nickname);
    }
  }
}

export default { name: data.name, once: data.once, Impl };
