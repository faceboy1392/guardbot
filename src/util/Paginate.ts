import {
  CommandInteraction,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ButtonBuilder,
  StringSelectMenuBuilder,
  SelectMenuComponentOptionData,
  ButtonInteraction,
  Embed,
  ComponentType,
} from "discord.js";
import colors from "./colors";

function trim(str: string, max: number = 2000): string {
  return str.length > max - 3 ? `${str.slice(0, max - 3)}[…]` : str;
}

//! this code is truly awful, proceed at your own risk

export default class Paginate {
  /**
   * Paginates an array of string items.
   * @param options
   */
  static async list(options: { interaction: CommandInteraction; items: string[]; embed: EmbedBuilder; itemsPerPage: number; idle?: number; ephemeral?: boolean; followUp?: boolean }) {
    const { interaction, items, embed, itemsPerPage, followUp, ephemeral } = options;
    const description = embed.data.description || "";
    const idle = options.idle ? options.idle * 1000 : 30_000;

    if (items.length <= itemsPerPage) {
      embed.setDescription(description + "\n\n" + items.join("\n"));
      return interaction[followUp ? "followUp" : "reply"]({ embeds: [embed], ephemeral });
    }

    let pageNum = 1;
    let maxPage = Math.ceil(items.length / itemsPerPage);

    function selectItems(pageNum: number) {
      return items.slice((pageNum - 1) * itemsPerPage, Math.min(pageNum * itemsPerPage, items.length));
    }

    function updateButtons(row: ActionRowBuilder<ButtonBuilder>, page: number) {
      row.components[0].setDisabled(page === 1);
      row.components[1].setDisabled(page === 1);
      row.components[2].setLabel(`Page ${pageNum}`);
      row.components[3].setDisabled(page === maxPage);
      row.components[4].setDisabled(page === maxPage);
      return row;
    }

    let selectedItems = selectItems(1);

    embed.setDescription(description + "\n\n" + selectedItems.join("\n"));

    // Add a new option to the select menu (defined later) for each page number
    let pages: { label: string; value: string; default?: boolean }[] = [];
    for (let i = 1; i <= Math.min(maxPage, 25); i++) {
      pages.push({
        label: `Page ${i}`,
        value: `${i}`,
      });
    }

    let row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji("⏪").setStyle(ButtonStyle.Primary).setCustomId("first").setDisabled(true),
      new ButtonBuilder().setEmoji("◀️").setStyle(ButtonStyle.Primary).setCustomId("previous").setDisabled(true),
      new ButtonBuilder().setLabel(`Page ${pageNum}`).setStyle(ButtonStyle.Secondary).setCustomId("pagenum").setDisabled(true),
      new ButtonBuilder().setEmoji("▶️").setStyle(ButtonStyle.Primary).setCustomId("next"),
      new ButtonBuilder().setEmoji("⏩").setStyle(ButtonStyle.Primary).setCustomId("last")
    );

    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setPlaceholder("Select page...").setCustomId("page_select").addOptions(pages));

    function updateMenu() {
      if (pageNum > 12 && maxPage > 25) {
        const newPages: typeof pages = [];
        for (let i = pageNum - 12; i <= Math.min(pageNum + 12, maxPage); i++) {
          newPages.push({
            label: `Page ${i}`,
            value: `${i}`,
            default: i === pageNum,
          });
        }
        pages = newPages;
        row2.components[0].setOptions(pages);
      } else {
        const newPages: typeof pages = [];
        for (let i = 1; i <= Math.min(maxPage, 25); i++) {
          newPages.push({
            label: `Page ${i}`,
            value: `${i}`,
            default: i === pageNum,
          });
        }
        pages = newPages;
        row2.components[0].setOptions(pages);
      }
    }

    const sent = await interaction[followUp ? "followUp" : "reply"]({
      embeds: [embed],
      components: [row1, row2],
      fetchReply: true,
      ephemeral,
    });

    // This is here because some discordjs typings seem to be weird
    if (!("createMessageComponentCollector" in sent)) return;
    const collector = sent.createMessageComponentCollector({
      idle: idle,
      filter: (i: Interaction) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i: Interaction) => {
      if (i.isButton()) {
        switch (i.customId) {
          case "first":
            pageNum = 1;
            break;
          case "previous":
            if (pageNum <= 1) break;
            pageNum -= 1;
            break;
          case "next":
            if (pageNum >= maxPage) break;
            pageNum += 1;
            break;
          case "last":
            pageNum = maxPage;
            break;
        }

        updateMenu();

        row1 = updateButtons(row1, pageNum);
        selectedItems = selectItems(pageNum);
        embed.setDescription(description + "\n\n" + selectedItems.join("\n"));

        await i.update({ embeds: [embed], components: [row1, row2] });
      } else if (i.isStringSelectMenu()) {
        pageNum = parseInt(i.values[0]);

        row1 = updateButtons(row1, pageNum);
        selectedItems = selectItems(pageNum);
        embed.setDescription(description + "\n\n" + selectedItems.join("\n"));

        updateMenu();

        await i.update({ embeds: [embed], components: [row1, row2] });
      }
    });

    collector.on("end", async () => {
      // Check if it has been deleted
      try {
        // tryna get the squiggly red lines to go away
        if (!interaction.channel) return;
        const fetched = await interaction.channel.messages.fetch(sent.id);
        if (!fetched) return;
      } catch (error) {
        return;
      }

      row1.components.forEach((comp) => comp.setDisabled(true));
      row2.components[0].setDisabled(true);
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    });
  }

  //* bruh

  /**
   * Paginates an array of string items, and allows selecting elements from that array.
   * @param options
   */
  static select(options: {
    interaction: CommandInteraction;
    items: string[];
    embed: EmbedBuilder;
    itemsPerPage: number;
    idle?: number;
    ephemeral?: boolean;
    followUp?: boolean;
    trimItems?: number;
  }): Promise<{ indexes: number[]; i: ButtonInteraction }> {
    return new Promise(async (resolve, reject) => {
      const { interaction, items, embed, itemsPerPage, followUp } = options;
      const description = embed.data.description || "";
      const idle = options.idle ? options.idle * 1000 : 30_000;
      const trimLength = options.trimItems ?? 80;

      let pageNum = 1;
      let maxPage = Math.ceil(items.length / itemsPerPage);

      function selectItems(pageNum: number) {
        return items.slice((pageNum - 1) * itemsPerPage, Math.min(pageNum * itemsPerPage, items.length));
      }

      function updateButtons(row: ActionRowBuilder<ButtonBuilder>, page: number) {
        row.components[0].setDisabled(page === 1);
        row.components[1].setDisabled(page === 1);
        row.components[2].setLabel(`Page ${pageNum}`);
        row.components[3].setDisabled(page === maxPage);
        row.components[4].setDisabled(page === maxPage);
        return row;
      }

      let currentItems = selectItems(1);
      let currentItemsAsOptions = currentItems.map((item, index) => {
        return { label: trim(item, Math.min(trimLength, 100)), value: `${(pageNum - 1) * itemsPerPage + index}` };
      });
      let selectedIndexes: number[] = [];

      embed.setDescription(description + "\n\n" + currentItems.map((i) => trim(i, trimLength)).join("\n"));

      // Add a new option to the select menu (defined later) for each page number
      let pages: SelectMenuComponentOptionData[] = [];
      for (let i = 1; i <= Math.min(maxPage, 25); i++) {
        pages.push({
          label: `Page ${i}`,
          value: `${i}`,
        });
      }

      let row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setEmoji("⏪").setStyle(ButtonStyle.Primary).setCustomId("first").setDisabled(true),
        new ButtonBuilder().setEmoji("◀️").setStyle(ButtonStyle.Primary).setCustomId("previous").setDisabled(true),
        new ButtonBuilder().setLabel(`Page ${pageNum}`).setStyle(ButtonStyle.Secondary).setCustomId("pagenum").setDisabled(true),
        new ButtonBuilder().setEmoji("▶️").setStyle(ButtonStyle.Primary).setCustomId("next"),
        new ButtonBuilder().setEmoji("⏩").setStyle(ButtonStyle.Primary).setCustomId("last")
      );

      const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setPlaceholder("Select page...").setCustomId("page_select").addOptions(pages));

      const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel("Confirm").setStyle(ButtonStyle.Success).setCustomId("select_confirm").setDisabled(true),
        new ButtonBuilder()
          .setLabel(`${selectedIndexes.length} item${selectedIndexes.length !== 1 ? "s" : ""} selected`)
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("bruh")
          .setDisabled(true),
        new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Danger).setCustomId("select_cancel")
      );

      const row4 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setPlaceholder("Select items...").setCustomId("select_item").addOptions(currentItemsAsOptions).setMaxValues(Math.min(items.length, itemsPerPage))
      );

      function updateMenu() {
        if (pageNum > 12 && maxPage > 25) {
          const newPages: typeof pages = [];
          for (let i = pageNum - 12; i <= Math.min(pageNum + 12, maxPage); i++) {
            newPages.push({
              label: `Page ${i}`,
              value: `${i}`,
              default: i === pageNum,
            });
          }
          pages = newPages;
          row2.components[0].setOptions(pages);
        } else {
          const newPages: typeof pages = [];
          for (let i = 1; i <= Math.min(maxPage, 25); i++) {
            newPages.push({
              label: `Page ${i}`,
              value: `${i}`,
              default: i === pageNum,
            });
          }
          pages = newPages;
          row2.components[0].setOptions(pages);
        }
        currentItemsAsOptions = currentItems.map((item, index) => {
          return {
            label: trim(item, Math.min(trimLength, 100)),
            value: `${(pageNum - 1) * itemsPerPage + index}`,
            emoji: selectedIndexes.includes((pageNum - 1) * itemsPerPage + index) ? "🔸" : undefined,
          };
        });
        row3.components[0].setDisabled(selectedIndexes.length === 0);
        row3.components[1].setLabel(`${selectedIndexes.length} item${selectedIndexes.length !== 1 ? "s" : ""} selected`);
        row4.components[0].setMaxValues(Math.min(items.length, currentItemsAsOptions.length));
        row4.components[0].setOptions(currentItemsAsOptions);
      }

      function getComponents() {
        return items.length > itemsPerPage ? [row1, row2, row3, row4] : [row3, row4];
      }

      const sent = await interaction[followUp ? "followUp" : "reply"]({
        embeds: [embed],
        components: getComponents(),
        fetchReply: true,
        ephemeral: options.ephemeral,
      });

      // This is here because some discordjs typings seem to be weird
      if (!("createMessageComponentCollector" in sent)) return;
      const collector = sent.createMessageComponentCollector({
        filter: (i: Interaction) => i.user.id === interaction.user.id,
        idle,
      });

      let lastInteraction: ButtonInteraction;
      collector.on("collect", async (i: Interaction) => {
        if (!i.isMessageComponent()) return;
        if (i.customId.startsWith("select_")) {
          if (i.isStringSelectMenu()) {
            // Item select menu
            for (const value of i.values) {
              const num = parseInt(value);
              if (selectedIndexes.includes(num)) selectedIndexes = selectedIndexes.filter((v) => v !== num);
              else selectedIndexes.push(parseInt(value));
            }
            updateMenu();
            await i.update({ embeds: [embed], components: getComponents() });
          } else if (i.isButton()) {
            // Confirm / cancel buttons
            if (i.customId === "select_confirm") {
              lastInteraction = i;
              return collector.stop("resolve");
            } else if (i.customId === "select_cancel") {
              return collector.stop("cancel");
            }
          }
        } else {
          // Paginate controls
          if (i.isButton()) {
            switch (i.customId) {
              case "first":
                pageNum = 1;
                break;
              case "previous":
                if (pageNum <= 1) break;
                pageNum -= 1;
                break;
              case "next":
                if (pageNum >= maxPage) break;
                pageNum += 1;
                break;
              case "last":
                pageNum = maxPage;
                break;
            }

            row1 = updateButtons(row1, pageNum);
            currentItems = selectItems(pageNum);
            embed.setDescription(description + "\n\n" + currentItems.map((i) => trim(i, trimLength)).join("\n"));
            updateMenu();
            await i.update({ embeds: [embed], components: getComponents() });
          } else if (i.isStringSelectMenu()) {
            pageNum = parseInt(i.values[0]);

            row1 = updateButtons(row1, pageNum);
            currentItems = selectItems(pageNum);
            embed.setDescription(description + "\n\n" + currentItems.map((i) => trim(i, trimLength)).join("\n"));
            updateMenu();
            await i.update({ embeds: [embed], components: getComponents() });
          }
        }
      });

      collector.on("end", async (_, reason) => {
        // Check if it has been deleted
        try {
          // tryna get the squiggly red lines to go away
          if (!interaction.channel) return;
          const fetched = await interaction.channel.messages.fetch(sent.id);
          if (!fetched) return;
        } catch (error) {
          return;
        }

        row1.components.forEach((comp) => comp.setDisabled(true));
        row2.components[0].setDisabled(true);
        row3.components.forEach((comp) => comp.setDisabled(true));
        row4.components[0].setDisabled(true);
        await interaction.editReply({
          embeds: [embed],
          components: items.length > itemsPerPage ? [row1, row2, row3, row4] : [row3, row4],
        });

        if (reason === "resolve") resolve({ indexes: selectedIndexes, i: lastInteraction });
        else if (reason === "cancel") reject({ reason: "cancel", i: lastInteraction });
        else reject({ reason: "time", i: lastInteraction });
      });
    });
  }

  //! warning, this thing is a mess because im copying and haphazardly adjusting the code for the select version

  /**
   * An item can be selected to be expanded upon
   * @param options
   */
  static async expandable(options: {
    interaction: CommandInteraction;
    items: string[];
    embed: EmbedBuilder;
    itemsPerPage: number;
    idle?: number;
    ephemeral?: boolean;
    followUp?: boolean;
    trimItems?: number;
    selectMenuPreview?: (index: number, item?: string) => string;
    expand: (index: number, item?: string) => string | EmbedBuilder | Promise<string | EmbedBuilder>;
  }) {
    const { interaction, items, embed, itemsPerPage, followUp } = options;
    const description = embed.data.description || "";
    const idle = options.idle ? options.idle * 1000 : 30_000;
    const trimLength = options.trimItems ?? 80;

    let pageNum = 1;
    let maxPage = Math.ceil(items.length / itemsPerPage);

    function selectItems(pageNum: number) {
      return items.slice((pageNum - 1) * itemsPerPage, Math.min(pageNum * itemsPerPage, items.length));
    }

    function updateButtons(row: ActionRowBuilder<ButtonBuilder>, page: number) {
      row.components[0].setDisabled(page === 1);
      row.components[1].setDisabled(page === 1);
      row.components[2].setLabel(`Page ${pageNum}`);
      row.components[3].setDisabled(page === maxPage);
      row.components[4].setDisabled(page === maxPage);
      return row;
    }

    let currentItems = selectItems(1);
    let currentItemsAsOptions = currentItems.map((item, index) => {
      if (options.selectMenuPreview)
        return {
          label: trim(options.selectMenuPreview(index, item), Math.min(trimLength, 100)),
          value: `${(pageNum - 1) * itemsPerPage + index}`,
        };
      else
        return {
          label: trim(item, Math.min(trimLength, 100)),
          value: `${(pageNum - 1) * itemsPerPage + index}`,
        };
    });

    embed.setDescription(description + "\n\n" + currentItems.map((i) => trim(i, trimLength)).join("\n"));

    // Add a new option to the select menu (defined later) for each page number
    let pages: SelectMenuComponentOptionData[] = [];
    for (let i = 1; i <= Math.min(maxPage, 25); i++) {
      pages.push({
        label: `Page ${i}`,
        value: `${i}`,
      });
    }

    let row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji("⏪").setStyle(ButtonStyle.Primary).setCustomId("first").setDisabled(true),
      new ButtonBuilder().setEmoji("◀️").setStyle(ButtonStyle.Primary).setCustomId("previous").setDisabled(true),
      new ButtonBuilder().setLabel(`Page ${pageNum}`).setStyle(ButtonStyle.Secondary).setCustomId("pagenum").setDisabled(true),
      new ButtonBuilder().setEmoji("▶️").setStyle(ButtonStyle.Primary).setCustomId("next"),
      new ButtonBuilder().setEmoji("⏩").setStyle(ButtonStyle.Primary).setCustomId("last")
    );

    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setPlaceholder("Select page...").setCustomId("page_select").addOptions(pages));

    const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setPlaceholder("Expand item...").setCustomId("select_item").addOptions(currentItemsAsOptions).setMaxValues(1)
    );

    function updateMenu() {
      if (pageNum > 12 && maxPage > 25) {
        const newPages: typeof pages = [];
        for (let i = pageNum - 12; i <= Math.min(pageNum + 12, maxPage); i++) {
          newPages.push({
            label: `Page ${i}`,
            value: `${i}`,
            default: i === pageNum,
          });
        }
        pages = newPages;
        row2.components[0].setOptions(pages);
      } else {
        const newPages: typeof pages = [];
        for (let i = 1; i <= Math.min(maxPage, 25); i++) {
          newPages.push({
            label: `Page ${i}`,
            value: `${i}`,
            default: i === pageNum,
          });
        }
        pages = newPages;
        row2.components[0].setOptions(pages);
      }
      currentItemsAsOptions = currentItems.map((item, index) => {
        if (options.selectMenuPreview)
          return {
            label: trim(options.selectMenuPreview(index, item), Math.min(trimLength, 100)),
            value: `${(pageNum - 1) * itemsPerPage + index}`,
          };
        else
          return {
            label: trim(item, Math.min(trimLength, 100)),
            value: `${(pageNum - 1) * itemsPerPage + index}`,
          };
      });
      row3.components[0].setMaxValues(1);
      row3.components[0].setOptions(currentItemsAsOptions);
    }

    function getComponents() {
      return items.length > itemsPerPage ? [row1, row2, row3] : [row3];
    }

    const sent = await interaction[followUp ? "followUp" : "reply"]({
      embeds: [embed],
      components: getComponents(),
      fetchReply: true,
      ephemeral: options.ephemeral,
    });

    // This is here because some discordjs typings seem to be weird
    if (!("createMessageComponentCollector" in sent)) return;
    const collector = sent.createMessageComponentCollector({
      filter: (i: Interaction) => i.user.id === interaction.user.id,
      idle,
    });

    collector.on("collect", async (i: Interaction) => {
      if (!i.isMessageComponent()) return;
      if (i.customId === "back") return;
      if (i.customId.startsWith("select_")) {
        if (i.isStringSelectMenu()) {
          // Item select menu
          const num = parseInt(i.values[0]);
          let expanded = await options.expand(num, items[num]);
          let newEmbed: EmbedBuilder;
          if (typeof expanded === "string") newEmbed = new EmbedBuilder().setColor(colors.Invis).setDescription(expanded);
          else newEmbed = expanded;
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Back").setEmoji("⬅️").setCustomId("back"));

          const sentExpanded = await i.update({ embeds: [newEmbed], components: [row] });
          try {
            const idkAnymoreVariableNames = await sentExpanded.awaitMessageComponent({ filter: (b) => b.user.id === interaction.user.id && b.customId === "back", time: 10 * 60_000, componentType: ComponentType.Button });
            await idkAnymoreVariableNames.update({ embeds: [embed], components: getComponents() });
          } catch (err) {
            return collector.stop();
          }
          // updateMenu();
          // await i.update({ embeds: [embed], components: getComponents() });
        }
      } else {
        // Paginate controls
        if (i.isButton()) {
          switch (i.customId) {
            case "first":
              pageNum = 1;
              break;
            case "previous":
              if (pageNum <= 1) break;
              pageNum -= 1;
              break;
            case "next":
              if (pageNum >= maxPage) break;
              pageNum += 1;
              break;
            case "last":
              pageNum = maxPage;
              break;
          }

          row1 = updateButtons(row1, pageNum);
          currentItems = selectItems(pageNum);
          embed.setDescription(description + "\n\n" + currentItems.map((i) => trim(i, trimLength)).join("\n"));
          updateMenu();
          await i.update({ embeds: [embed], components: getComponents() });
        } else if (i.isStringSelectMenu()) {
          pageNum = parseInt(i.values[0]);

          row1 = updateButtons(row1, pageNum);
          currentItems = selectItems(pageNum);
          embed.setDescription(description + "\n\n" + currentItems.map((i) => trim(i, trimLength)).join("\n"));
          updateMenu();
          await i.update({ embeds: [embed], components: getComponents() });
        }
      }
    });

    collector.on("end", async (_, reason) => {
      // Check if it has been deleted
      try {
        // tryna get the squiggly red lines to go away
        if (!interaction.channel) return;
        const fetched = await interaction.channel.messages.fetch(sent.id);
        if (!fetched) return;
      } catch (error) {
        return;
      }

      row1.components.forEach((comp) => comp.setDisabled(true));
      row2.components[0].setDisabled(true);
      row3.components[0].setDisabled(true);
      await interaction.editReply({
        embeds: [embed],
        components: items.length > itemsPerPage ? [row1, row2, row3] : [row3],
      });
    });
  }
}
