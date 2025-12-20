import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { replyToInteraction } from "../../src/command-handler";
import { formatNumber } from "../../src/utils";

import { solvePromptWithTimeout } from "../../src/dictionary/dictionary";
import { Highlighter } from "../../src/highlighting/Highlighter";
import {
  getPromptRegexDisplayText,
  getPromptRegexFromPromptSearch,
} from "../../src/regex";

export const data = new SlashCommandBuilder()
  .setName("count")
  .setDescription("Find the amount of solves for a slice!")
  .addStringOption((option) =>
    option
      .setName("slice")
      .setDescription("The slice to search for")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("dictionary")
      .setDescription("The dictionary to search in")
      .setRequired(false)
      .addChoices({
        name: "English",
        value: "English",
      })
  );

export const JSON = data.toJSON();
const extras = {
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};
Object.keys(extras).forEach((key) => (JSON[key] = extras[key]));

export const broadcastable = true;

// create function to handle the command
export async function execute(
  interaction: ChatInputCommandInteraction,
  preferBroadcast: boolean
) {
  let prompt = interaction.options.get("slice").value as string;

  try {
    let regex = getPromptRegexFromPromptSearch(prompt);

    const [highlighter, solutions] = await Promise.all([
      Highlighter.fromCommandInteraction(interaction, "vivi"),
      solvePromptWithTimeout(regex, 2000, null),
    ]);
    let solveCount = solutions.length;

    if (solveCount === 0) {
      await replyToInteraction(
        interaction,
        "Solve Count",
        "\n• That slice is not solveable.",
        preferBroadcast
      );
    } else {
      await replyToInteraction(
        interaction,
        "Solve Count",
        "\n• There " +
          (solutions.length === 1
            ? "is **1** solution"
            : "are **" + formatNumber(solutions.length) + "** solutions") +
          " for " +
          getPromptRegexDisplayText(regex, highlighter) +
          ".",
        preferBroadcast
      );
    }
  } catch (error) {
    if (
      error.name === "SliceException" ||
      error.name === "SolveWorkerException"
    ) {
      await replyToInteraction(
        interaction,
        "Solve Count",
        "\n• " + error.message,
        preferBroadcast
      );
    } else {
      throw error;
    }
  }
}
