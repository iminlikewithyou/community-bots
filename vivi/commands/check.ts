import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getRemarkEmoji } from '../../src/emoji-renderer';
import { replyToInteraction } from '../../src/command-handler';

import { cleanWord, isWord } from '../../src/dictionary/dictionary';

export const data = new SlashCommandBuilder()
  .setName('check')
  .setDescription('Check if a word is in the dictionary!')
  .addStringOption(option =>
    option.setName('word')
      .setDescription('The word to check for')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('dictionary')
      .setDescription('The dictionary to check in')
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

// TODO - this should really be moved
const invalidWordRegex = /[^A-Z0-9'\-@ ]/;

// create function to handle the command
export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let word = cleanWord(interaction.options.get("word").value as string).toUpperCase();
  
  // check if the word only has valid characters
  if (invalidWordRegex.test(word)) {
    await replyToInteraction(interaction, "Word Status", "\n• Sorry, that's not a valid word!", preferBroadcast);
    return;
  }

  const isHomeServer = interaction.guildId === process.env.GUILD_ID;
  const unavailableEmoji = isHomeServer ? "<:Unavailable:1267171561987637248>" : "<:Unavailable:1267171142632738961>";
  const availableEmoji = isHomeServer ? "<:Available:1267171548712669286>" : "<:Available:1267171118251376731>";

  if (word.length > 34) {
    await replyToInteraction(interaction, "Word Status",
      '\n• **' + word.substring(0, 20) + '..'
      + '\n' + unavailableEmoji + ' Too long** to be a valid English word.'
    , preferBroadcast);
  } else if (isWord(word)) {
    await replyToInteraction(interaction, "Word Status",
      '\n• **' + word
      + '\n' + availableEmoji + ' Available** on live servers.'
    , preferBroadcast);
  } else {
    await replyToInteraction(interaction, "Word Status",
      '\n• **' + word
      + '\n' + unavailableEmoji + ' Not found** in the English dictionary.'
    , preferBroadcast);
  }
};