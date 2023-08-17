import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";

// This function cleans up and prepares the
// result of our eval command input for sending
// to the channel
const clean = async (bot: Bot, text: any) => {
  // If our input is a promise, await it before continuing
  if (text && text.constructor.name === "Promise") text = await text;

  // If the response isn't a string, `util.inspect()`
  // is used to 'stringify' the code in a safe way that
  // won't error out on objects with circular references
  // (like Collections, for example)
  if (typeof text !== "string") text = require("util").inspect(text, { depth: 1 });

  // Replace symbols with character code alternatives
  text = text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));

  // You will need to place this inside the clean
  // function, before the result is returned.
  text = text.replaceAll(bot.client.token, "[REDACTED]");

  // Send off the cleaned up result
  return text;
};

// Static data about the command
const data: CommandData = {
  structure: {
    name: "eval",
    description: "DEV COMMAND",
    type: CommandType.ChatInput,
    options: [
      {
        name: "code",
        description: "_",
        type: OptionType.String,
        required: true,
      },
    ],
  },
  scope: "guild",
  guildId: "1106204128528572608",
  perms: {
    bot: [],
  },
  __dirname,
};

// New instance of implementation made each time the command is used
class Impl extends Executable {
  async execute(bot: Bot, i: ChatInput, ctx: Ctx) {
    if (i.user.id !== "718930767740403753") return i.reply("no");
    ctx.devOnly();
    const code = i.options.getString("code");

    try {
      // Evaluate (execute) our input
      const evaled = eval(code);

      // Put our eval result through the function
      // we defined above
      const cleaned = await clean(bot, evaled);

      // Reply in the channel with our result
      i.reply(`\`\`\`js\n${cleaned}\n\`\`\``);
    } catch (err) {
      // Reply in the channel with our error
      i.reply(`\`ERROR\` \`\`\`xl\n${err}\n\`\`\``);
    }
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
