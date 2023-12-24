import { SlashCommandBuilder, CommandInteraction } from "discord.js";

import { replyToInteraction } from "../../src/command-handler";
import { formatNumber } from "../../src/utils";
import { addCash, getCash, spendCash } from "../../src/database/db";

export const data = new SlashCommandBuilder()
  .setName("cash")
  .setDescription("Check your cash");

export const tags = ["fun", "annoying"];

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let userCash = await getCash(interaction.user.id);
  await replyToInteraction(
    interaction,
    "Cash",
    "\n• You have " + formatNumber(userCash) + " cash.",
    false
  );
}
