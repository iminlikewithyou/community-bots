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

export const broadcastable = true;

// TODO - this should really be moved
const invalidWordRegex = /[^A-Z0-9'\-@ ]/;

// create function to handle the command
export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let word = cleanWord(interaction.options.get("word").value);
  
  // check if the word only has valid characters
  if (invalidWordRegex.test(word)) {
    await replyToInteraction(interaction, "Word Status", "\n- Sorry, that's not a valid word!", preferBroadcast);
    return;
  }

  if (word.length > 34) {
    await replyToInteraction(interaction, "Word Status",
      '\n- **' + word.substring(0, 20) + '..'
      + '\n' + getRemarkEmoji("bad") + ' Too long** to be a valid English word.'
    , preferBroadcast);
  } else if (isWord(word)) {
    await replyToInteraction(interaction, "Word Status",
      '\n- **' + word
      + '\n' + getRemarkEmoji("good") + ' Available** on live servers.'
    , preferBroadcast);
  } else {
    await replyToInteraction(interaction, "Word Status",
      '\n- **' + word
      + '\n' + getRemarkEmoji("bad") + ' Not found** in the English dictionary.'
    , preferBroadcast);
  }
};