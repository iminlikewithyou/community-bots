import { replyToInteraction } from '../../src/command-handler';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { formatNumber } from '../../src/utils';

import { cleanWord, solvePromptWithTimeout } from '../../src/dictionary/dictionary';
import { getPromptRegexDisplayText, getPromptRegexFromPromptSearch } from '../../src/regex';
import { Highlighters } from '../../src/themes/highlighter';

export const data = new SlashCommandBuilder()
  .setName('count')
  .setDescription('Find the amount of solves for a prompt!')
  .addStringOption(option =>
    option.setName('prompt')
      .setDescription('The prompt to search for')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('dictionary')
      .setDescription('The dictionary to search in')
      .setRequired(false)
      .addChoices({
        name: 'English',
        value: 'English'
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

  const isHomeServer = interaction.guildId === process.env.GUILD_ID;
  const highlighter = isHomeServer ? Highlighters.Default : Highlighters.Vivi;
  
  try {
    let regex = getPromptRegexFromPromptSearch(prompt);

    let solutions = await solvePromptWithTimeout(regex, 1300, null);
    let solveCount = solutions.length;

    if (solveCount === 0) {
      await replyToInteraction(interaction, "Solve Count", "\n• That prompt is impossible.", preferBroadcast);
    } else {
      await replyToInteraction(interaction, "Solve Count",
        '\n• There '
        + (solutions.length === 1 ? 'is **1** solution' : 'are **' + formatNumber(solutions.length) + '** solutions')
        + ' for ' + getPromptRegexDisplayText(regex, highlighter) + '.'
      , preferBroadcast);
    }
  } catch (error) {
    if (error.name === 'PromptException' || error.name === 'SolveWorkerException') {
      await replyToInteraction(interaction, "Solve Count", "\n• " + error.message, preferBroadcast);
    } else {
      throw error;
    }
  }
};
