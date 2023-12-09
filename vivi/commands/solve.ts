import { replyToInteraction, getInteractionContent } from '../../src/command-handler';
import { getSolveLetters } from '../../src/emoji-renderer';
import { CommandInteraction, SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { formatNumber, shuffle, SortingFunctions } from '../../src/utils';
import { cleanWord, getPromptRegexFromPromptSearch, solvePromptWithTimeout } from '../../src/dictionary/dictionary';
import { Argument, parseArguments } from '../../src/argument-parser';

// export const data = new SlashCommandBuilder()
//   .setName('solve')
//   .setDescription('Solve a prompt!')
//   .addStringOption(option =>
//     option.setName('prompt')
//       .setDescription('The prompt to solve')
//       .setRequired(true))
//   .addStringOption(option =>
//     option.setName('dictionary')
//       .setDescription('The dictionary to solve in')
//       .setRequired(false)
//       .addChoices({
//         name: 'English',
//         value: 'English'
//       }))
//   .addStringOption(option => 
//     option.setName('sorting')
//       .setDescription("How to sort solutions (forces text file output)")
//       .setRequired(false)
//       .addChoices({
//         name: 'Length (Descending)',
//         value: 'lengthDescending'
//       }, {
//         name: 'Length (Ascending)',
//         value: 'lengthAscending'
//       }, {
//         name: 'Alphabetical',
//         value: 'alphabetical'
//       }, {
//         name: 'Length (Descending), Alphabetical',
//         value: 'lengthThenAlphabetical'
//       }));

export const data = new SlashCommandBuilder()
  .setName('solve')
  .setDescription('Solve a prompt!')
  .addStringOption(option =>
    option.setName('prompt')
      .setDescription('The prompt to solve')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('arguments')
      .setDescription('Arguments for the solver')
      .setRequired(false)
  );


export const broadcastable = true;

// create function to handle the command
export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let prompt = cleanWord(interaction.options.get("prompt", true).value);
  let _arguments = interaction.options.get("arguments", false)?.value as string ?? "";
  
  let args = parseArguments(_arguments);
  let { sort, file, regex, min, max } = args;
  console.log(args);

  try {
    // cleanWord is called twice here on prompt
    let regex = getPromptRegexFromPromptSearch(prompt);

    let solutions: string[] = await solvePromptWithTimeout(regex, 1300, interaction.user.id);
    if (solutions.length !== 0 && (min !== undefined || max !== undefined)) { solutions = solutions.filter((v) => v.length >= min && v.length <= max); }
    let solveCount = solutions.length;

    let solverString = '\nI found '
    + (solutions.length === 1 ? '**1** solution!' : '**' + formatNumber(solutions.length) + '** solutions!')
    + '\n';

    if ((sort !== undefined && solveCount > 0) || file) {
      solutions.sort(sort);

      // let fHeader = solveCount === 1 ? "1 solution" : `${formatNumber(solveCount)} solutions` + ` for \`${prompt}\` ` + `sorted by ${sorting_formatted}!`;
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

      let solutionStrings: string[] = [];
      let solutionsLength = 0;

      for (let i = 0; i < Math.min(solutions.length, 4); i++) {
        let solution = solutions[i];
        
        let solutionString = '\n• ' + getSolveLetters(solution, regex);
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
