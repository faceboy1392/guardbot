import { ChatInput, CommandData, CommandType, Ctx, Executable, OptionType } from "../../classes/Command";
import Bot from "../../classes/Bot";

import Canvas from "@napi-rs/canvas";
import sharp from "sharp";
import vibrant from "node-vibrant";
import { AttachmentBuilder } from "discord.js";

// changing these will break it completely because im stupid so dont change them
const width = 700;
const height = 250;

const pfpRadius = 75;

// Static data about the command
const data: CommandData = {
  structure: {
    name: "rank",
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
    const guildMember = await bot.prisma.guildMember.findUnique({ where: { userId_guildId: { guildId: i.guildId, userId: i.user.id } } });
    i.reply({ content: `You are level \`${guildMember.rank}\` and have \`${guildMember.xp}\` xp.`, ephemeral: true });

    // ctx.devOnly();

    // const member = await i.guild.members.fetch(i.user);

    // const canvas = Canvas.createCanvas(700, 250);
    // const context = canvas.getContext("2d");

    // function calcFontSize(text: string, fontSize: number, w: number) {
    //   fontSize += 5;
    //   do {
    //     context.font = `${(fontSize -= 5)}px Quicksand, Arial, sans-serif`;
    //   } while (context.measureText(text).width > w);
    //   {
    //   }
    //   return context.font;
    // }

    // // const url = "https://i.imgur.com/kuSPIRS.jpg";
    // const url = i.options.getString("url") || "https://i.imgur.com/kuSPIRS.jpg";
    // const image = await (await fetch(url)).arrayBuffer();

    // const normal = await sharp(image).resize({ width, height, fit: "cover" }).png().toBuffer();
    // const blurred = await sharp(image).resize({ width, height, fit: "cover" }).blur(5).png().removeAlpha().ensureAlpha(0.4).toBuffer();

    // context.beginPath();
    // context.roundRect(25, 25, width - 50, height - 50, 25);
    // context.closePath();
    // context.fillStyle = "#111114";
    // context.fill();
    // context.closePath();

    // context.globalCompositeOperation = "source-atop";
    // context.drawImage(await Canvas.loadImage(blurred), 0, 0, canvas.width, canvas.height);

    // context.globalCompositeOperation = "destination-over";
    // context.drawImage(await Canvas.loadImage(normal), 0, 0, canvas.width, canvas.height);

    // context.globalCompositeOperation = "source-over";

    // const palette = await new vibrant(url, { quality: 1 }).getPalette();
    // const color = palette.Vibrant.hex;

    // context.strokeStyle = color;
    // context.lineWidth = 3;

    // context.beginPath();
    // context.roundRect(25, 25, width - 50, height - 50, 25);
    // context.stroke();
    // context.closePath();

    // //* pfp
    // const pfpImage = await (await fetch(member.user.displayAvatarURL({ extension: "jpg" }))).arrayBuffer();
    // // ctx.strokeRect(0, 0, canvas.width, canvas.height);
    // context.save();
    // // Create a circular clipping path
    // context.beginPath();
    // context.arc(125, 125, pfpRadius, 0, Math.PI * 2, true);
    // context.clip();
    // // Draw the image onto the canvas
    // context.drawImage(await Canvas.loadImage(pfpImage), 50, 50, 150, 150);
    // // Restore the canvas state
    // context.restore();
    // // Create a colorable ring around the circular image
    // context.beginPath();
    // context.arc(125, 125, pfpRadius + 7, 0, Math.PI * 2, true);
    // switch (member.presence.status) {
    //   case "online":
    //     context.strokeStyle = "#28a45c";
    //     break;
    //   case "idle":
    //     context.strokeStyle = "#f8b434";
    //     break;
    //   case "dnd":
    //     context.strokeStyle = "#f83c44";
    //     break;
    //   case "offline":
    //   case "invisible":
    //     context.strokeStyle = "#84848c";
    // }
    // context.stroke();
    // context.closePath();

    // //* text
    // context.fillStyle = "#fff";
    // calcFontSize(member.displayName, 45, 350);
    // context.fillText(member.displayName, 245, 90);

    // let xp = 243;
    // let levelUp = 750;
    // let percent = 243 / 750;

    // context.beginPath();
    // context.roundRect(230, height / 2 - 14, width - 310, 28, 14);
    // context.fillStyle = "#2f2f3388";
    // context.fill();
    // context.closePath();

    // context.beginPath();
    // context.roundRect(230, height / 2 - 14, (width - 310) * percent, 28, 14);
    // context.fillStyle = palette.LightVibrant.hex;
    // context.fill();
    // context.closePath();

    // context.strokeStyle = "white";
    // context.beginPath();
    // context.roundRect(230, height / 2 - 14, width - 310, 28, 14);
    // context.stroke();
    // context.closePath();

    // const attachment = new AttachmentBuilder(await canvas.encode("png"), { name: "profile-image.png" });

    // i.reply({ files: [attachment] });
  }
}

// don't touch this
export default { data, name: data.structure.name, Impl };
