import { AttachmentBuilder, CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getInteractionContent, replyToInteraction } from '../../src/command-handler';
import { SortingFunctions, formatNumber, shuffle } from '../../src/utils';

import { solvePromptWithTimeout } from '../../src/dictionary/dictionary';
import { getPromptRegexFromPromptSearch } from '../../src/regex';
import { Highlighters } from '../../src/themes/highlighter';

export const data = new SlashCommandBuilder()
  .setName('solve')
  .setDescription('Solve a prompt!')
  .addStringOption(option =>
    option.setName('prompt')
      .setDescription('The prompt to solve')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('dictionary')
      .setDescription('The dictionary to solve in')
      .setRequired(false)
      .addChoices({
        name: 'English',
        value: 'English'
      }))
  .addStringOption(option => 
    option.setName('sorting')
      .setDescription("How to sort solutions (forces text file output)")
      .setRequired(false)
      .addChoices({
        name: 'Length (Descending)',
        value: 'lengthDescending'
      }, {
        name: 'Length (Ascending)',
        value: 'lengthAscending'
      }, {
        name: 'Alphabetical',
        value: 'alphabetical'
      }, {
        name: 'Length (Descending), Alphabetical',
        value: 'lengthThenAlphabetical'
      }));

export const JSON = data.toJSON();
const extras = {
  "integration_types": [0, 1],
  "contexts": [0, 1, 2]
}
Object.keys(extras).forEach(key => JSON[key] = extras[key]);

export const broadcastable = true;

// create function to handle the command
export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let prompt = interaction.options.get("prompt").value as string;
  let sorting: string = interaction.options.get("sorting")?.value as string ?? "None";

  const isHomeServer = interaction.guildId === process.env.GUILD_ID;
  const highlighter = isHomeServer ? Highlighters.Default : Highlighters.Vivi;

  try {
    let regex = getPromptRegexFromPromptSearch(prompt);

    let solutions: string[] = await solvePromptWithTimeout(regex, 1300, interaction.user.id);
    let solveCount = solutions.length;

    let solverString = '\nI found '
    + (solutions.length === 1 ? '**1** solution!' : '**' + formatNumber(solutions.length) + '** solutions!')
    + '\n';

    if (sorting !== "None" && solveCount > 0) {
      solutions.sort(SortingFunctions[sorting]);

      let fileData = Buffer.from(solutions.join("\n"), "utf-8");
      let attachment = new AttachmentBuilder(fileData, { name: `vivi-result.txt` });

      return await interaction.reply({
        content: getInteractionContent(interaction, "Solver", solverString, preferBroadcast),
        files: [attachment],
        ephemeral: !preferBroadcast
      })
    }

    if (solveCount === 0) {
      await replyToInteraction(interaction, "Solver", "\n• That prompt is impossible.", preferBroadcast);
    } else {
      shuffle(solutions);

      let solutionStrings = [];
      let solutionsLength = 0;

      for (let i = 0; i < Math.min(solutions.length, 4); i++) {
        let solution = solutions[i];

        let solutionString = '\n• ' + highlighter.highlight(solution, regex);
        if (solutionsLength + solutionString.length > 1910) break;
        solutionStrings.push(solutionString);
        solutionsLength += solutionString.length;
      }

      solutionStrings.sort((a, b) => b.length - a.length || a.localeCompare(b));
      for (let solutionString of solutionStrings) solverString += solutionString;

      await replyToInteraction(interaction, "Solver", solverString, preferBroadcast);
    }
  } catch (error) {
    if (error.name === 'PromptException' || error.name === 'SolveWorkerException') {
      await replyToInteraction(interaction, "Solver", "\n• " + error.message, preferBroadcast);
    } else {
      throw error;
    }
  }
};
