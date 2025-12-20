import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import {
  getInteractionContent,
  replyToInteraction,
} from "../../src/command-handler";
import { SortingFunctions, formatNumber, shuffle } from "../../src/utils";

import { solvePromptWithTimeout } from "../../src/dictionary/dictionary";
import { Highlighter } from "../../src/highlighting/Highlighter";
import { getPromptRegexFromPromptSearch } from "../../src/regex";

export const data = new SlashCommandBuilder()
  .setName("solve")
  .setDescription("Solve a slice!")
  .addStringOption((option) =>
    option
      .setName("slice")
      .setDescription("The slice to solve")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("dictionary")
      .setDescription("The dictionary to solve in")
      .setRequired(false)
      .addChoices({
        name: "English",
        value: "English",
      })
  )
  .addStringOption((option) =>
    option
      .setName("sorting")
      .setDescription("How to sort solutions (forces text file output)")
      .setRequired(false)
      .addChoices(
        {
          name: "Length (Descending)",
          value: "lengthDescending",
        },
        {
          name: "Length (Ascending)",
          value: "lengthAscending",
        },
        {
          name: "Alphabetical",
          value: "alphabetical",
        },
        {
          name: "Length (Descending), Alphabetical",
          value: "lengthThenAlphabetical",
        }
      )
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
  let sorting: string =
    (interaction.options.get("sorting")?.value as string) ?? "None";

  try {
    let regex = getPromptRegexFromPromptSearch(prompt);

    const [highlighter, solutions] = await Promise.all([
      Highlighter.fromCommandInteraction(interaction, "vivi"),
      solvePromptWithTimeout(regex, 2000, null),
    ]);
    let solveCount = solutions.length;

    let solverString =
      "\nI found " +
      (solutions.length === 1
        ? "**1** solution!"
        : "**" + formatNumber(solutions.length) + "** solutions!") +
      "\n";

    if (sorting !== "None" && solveCount > 0) {
      solutions.sort(SortingFunctions[sorting]);

      let fileData = Buffer.from(solutions.join("\n"), "utf-8");
      let attachment = new AttachmentBuilder(fileData, {
        name: `vivi-result.txt`,
      });

      return await interaction.reply({
        content: getInteractionContent(
          interaction,
          "Solver",
          solverString,
          preferBroadcast
        ),
        files: [attachment],
        ephemeral: !preferBroadcast,
      });
    }

    if (solveCount === 0) {
      await replyToInteraction(
        interaction,
        "Solver",
        "\n• That slice is not solveable.",
        preferBroadcast
      );
    } else {
      shuffle(solutions);

      let solutionStrings = [];
      let solutionsLength = 0;

      for (let i = 0; i < Math.min(solutions.length, 4); i++) {
        let solution = solutions[i];

        let solutionString = "\n• " + highlighter.highlight(solution, regex);
        if (solutionsLength + solutionString.length > 1910) break;
        solutionStrings.push(solutionString);
        solutionsLength += solutionString.length;
      }

      solutionStrings.sort((a, b) => b.length - a.length || a.localeCompare(b));
      for (let solutionString of solutionStrings)
        solverString += solutionString;

      await replyToInteraction(
        interaction,
        "Solver",
        solverString,
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
        "Solver",
        "\n• " + error.message,
        preferBroadcast
      );
    } else {
      throw error;
    }
  }
}
