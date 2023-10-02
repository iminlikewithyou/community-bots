import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { joinRegularRuleLottery } from "../../src/database/db";
import { replyToInteraction } from "../../src/command-handler";
import { formatNumber } from "../../src/utils";

export const data = new SlashCommandBuilder()
  .setName("joinrulelottery")
  .setDescription("Join the regular rule lottery!");

// similar to the one found in WBM, but this checks before the decimal point
function isNumberStringVowelSound(x: string) {
  return /^1[18]\.?/g.test(x) || x.startsWith("8");
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let lotteryEntry = await joinRegularRuleLottery(interaction.user.id);

  if (lotteryEntry.currentEntry) {
    let { entries, joinedAt } = lotteryEntry.currentEntry;
    let chancePercentageString = (entries / lotteryEntry.totalEntries * 100).toFixed(0);
    await replyToInteraction(
      interaction,
      "Rule Lottery",
      "\n- You're already in the rule lottery! You joined the lottery <t:" + Math.floor(joinedAt / 1000) + ":R>."
      + `\n - You have **${formatNumber(entries)}** ${entries == 1 ? "entry" : "entries"}.`
      + `\n - You have ${isNumberStringVowelSound(chancePercentageString) ? "an" : "a"} **${chancePercentageString}%** chance of being selected.`,
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