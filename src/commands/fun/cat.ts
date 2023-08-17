import { ChatInput, CommandData, CommandType, Ctx, Executable, } from "../../classes/Command";
import Bot from "../../classes/Bot";
import { AttachmentBuilder } from "discord.js";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "cat",
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
    const response = await fetch('https://api.thecatapi.com/v1/images/search', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CAT_API_KEY
      }
    });
    
    const image = new AttachmentBuilder((await response.json())[0].url);
    await i.reply({ files: [image] })
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };