import { ChatInput, CommandData, CommandType, Ctx, Executable } from "../../classes/Command";
import Bot from "../../classes/Bot";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "test",
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
    i.reply({ content: ctx.settings?.nickname, ephemeral: true });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
