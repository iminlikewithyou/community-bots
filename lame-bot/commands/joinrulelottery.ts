import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { joinRegularRuleLottery } from "../../src/database/db";
import { replyToInteraction } from "../../src/command-handler";
import { formatNumber } from "../../src/utils";

export const data = new SlashCommandBuilder()
  .setName("joinrulelottery")
  .setDescription("Join the regular rule lottery!");

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let lotteryEntry = await joinRegularRuleLottery(interaction.user.id);

  if (lotteryEntry) {
    await replyToInteraction(
      interaction,
      "Rule Lottery",
      "\n- You're already in the rule lottery! You joined the lottery <t:" + Math.floor(lotteryEntry.joinedAt / 1000) + ":R>."
      + `\n - You have **${formatNumber(lotteryEntry.entries)}** ${lotteryEntry.entries == 1 ? "entry" : "entries"}.`
      + `\n - You have a **${(lotteryEntry.entries / lotteryEntry.totalEntries * 100).toFixed(1)}%** chance of being selected.`,
      false
    );
    return;
  }

  await replyToInteraction(
    interaction,
    "Rule Lottery",
    "\n- You've been entered into the rule lottery!",
    false
  );
}