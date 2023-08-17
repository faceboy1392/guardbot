import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType, } from "../../classes/Command";
import Bot from "../../classes/Bot";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "channel",
    description: "_",
    type: CommandType.ChatInput,
    options: [{
      name: "create",
      description: "_",
      type: OptionType.Subcommand
    }],
    dmPermission: false,
    defaultMemberPermissions: "ManageChannels"
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
    i.reply({ content: "my developer hasnt added this command yet 💀", ephemeral: true });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };