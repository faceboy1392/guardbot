import { ChatInput, CommandData, CommandType, Ctx, Executable, } from "../../classes/Command";
import Bob from "../../classes/Bot";

// Static data about the command
const data: CommandData = {
  structure: {
    name: "ping",
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
  async execute(bob: Bob, i: ChatInput, ctx: Ctx) {
    await i.reply({ content: "Pinging...", ephemeral: true });
    const sent = await i.fetchReply();
    await i.editReply(
      `Roundtrip latency: ${sent.createdTimestamp - i.createdTimestamp}ms\nWebsocket heartbeat: ${
        bob.client.ws.ping
      }`
    );
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };