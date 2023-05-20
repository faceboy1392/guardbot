import { ChatInput, CommandData, CommandType, Ctx, Executable, } from "../../classes/Command";
import Bot from "../../classes/Bot";
import ms from 'ms';

// Static data about the command
const data: CommandData = {
  structure: {
    name: "uptime",
    description: "_",
    type: CommandType.ChatInput,
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
    i.reply(`Uptime: ${ms(bot.client.uptime)}`);
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };