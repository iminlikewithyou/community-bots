import { SlashCommandBuilder, CommandInteraction } from "discord.js";

import { replyToInteraction } from "../../src/command-handler";
import { formatNumber } from "../../src/utils";
import { addCash, getCash, spendCash } from "../../src/database/db";

export const data = new SlashCommandBuilder()
  .setName("imbroke")
  .setDescription("give yourself money if you're poor");

export const cooldown = 90 * 1000;
export const tags = ["fun", "annoying"];

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  const claim = 25;
  const liftTo = 100;

  let userCash = await getCash(interaction.user.id);
  if (userCash > claim) {
    await replyToInteraction(
      interaction,
      "Declare Yourself Broke",
      "\n• You need less than " + claim + " cash to claim that you're broke. You have " + formatNumber(userCash) + " cash.",
      false
    );
    return;
  }
  await addCash(interaction.user.id, liftTo - userCash);

  await interaction.reply({
    content: "<@" + interaction.user.id + "> is broke!\nThey have been given **" + formatNumber(liftTo - userCash) + " cash**!"
  });
}
