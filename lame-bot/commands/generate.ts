import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { formatNumber } from "../../src/utils";
import { getAbsentLetters, getNormalLetters, getPromptLetters } from "../../src/emoji-renderer";
import { englishDictionary, englishStartMapStrings, isWordFastUnsafe } from "../../src/dictionary/dictionary";
import { addCash, getCash, spendCash } from "../../src/database/db";
import { replyToInteraction } from "../../src/command-handler";

export const data = new SlashCommandBuilder()
  .setName("generate")
  .setDescription("Test command - generate letters")
  .addIntegerOption(option =>
    option
      .setName("amount")
      .setDescription("Amount of letters to generate")
      .setRequired(false)
      .setMinValue(3)
      .setMaxValue(7)
  );

export const cooldown = 15 * 1000;

const tileScores = {
  "A": 1,
  "B": 4,
  "C": 4,
  "D": 2,
  "E": 1,
  "F": 4,
  "G": 3,
  "H": 3,
  "I": 1,
  "J": 10,
  "K": 5,
  "L": 2,
  "M": 4,
  "N": 2,
  "O": 1,
  "P": 4,
  "Q": 10,
  "R": 1,
  "S": 1,
  "T": 1,
  "U": 2,
  "V": 5,
  "W": 4,
  "X": 8,
  "Y": 3,
  "Z": 10,
}

async function sendMessage(interaction: CommandInteraction, content: string) {
  if (interaction.replied) {
    await interaction.editReply(content);
  } else {
    await interaction.reply(content);
  }
}

const rollingEmoji = [
  "<a:1:1155399336897822780>",
  "<a:2:1155399338416152606>",
  "<a:3:1155399340450398249>",
  "<a:4:1155399342023266334>"
]

function getRollingEmoji(index: number, amount: number) {
  let emoji = "";
  for (let i = 0; i < amount; i++) {
    emoji += rollingEmoji[(index + i) % rollingEmoji.length];
  }
  return emoji;
}

const defaultBag = "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";
const dupeLetterBag = true;

class Bag {
  letters: string;
  pulledLetters: string = "";
  
  constructor(letters: string) {
    this.letters = letters;
    if (dupeLetterBag) this.letters += letters;
  }

  pullLetter() {
    const letter = this.letters[Math.floor(Math.random() * this.letters.length)];
    this.letters = this.letters.replace(letter, "");
    this.pulledLetters += letter;
    return letter;
  }

  pullLetters(amount: number) {
    for (let i = 0; i < amount; i++) this.pullLetter();
  }
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  // await interaction.deferReply();
  const startTime = Date.now();

  let bag = new Bag(defaultBag);

  const letterCount = interaction.options.get("amount")?.value as number ?? 5;
  const map = englishStartMapStrings[letterCount];
  bag.pullLetters(letterCount);

  let pay = 25;
  let minPayout = 23;
  let maxPayout = 164;

  // minPayout at 3 letters and maxPayout at 7 letters
  let payout = Math.floor((maxPayout - minPayout) / 4 * (letterCount - 3) + minPayout + Math.random() * 19);

  let userCash = await getCash(interaction.user.id);
  if (userCash < pay) {
    await replyToInteraction(
      interaction,
      "Generate",
      "\n• You need " + pay + " cash for that. You have " + formatNumber(userCash) + " cash.",
      false
    );
    return;
  }
  await spendCash(interaction.user.id, pay);
  
  // about 0.2131147541 chance of payout


  // go through the word start map and find the most favorable word starts for the letters

  const getWordStartCount = (word: string) => {
    const regexp = new RegExp("^(\\d*)\\t" + word + "$", "m");
    
    // get the number from the capturing group
    const match = regexp.exec(map);
    
    // if there is no match, there are no words which start with this word
    if (!match) return 0;

    // return the number of words which start with this word
    const number = parseInt(match[1]);
    return number;
  };

  // Make every possible combination of starts which appear in the dictionary from the random letters
  const startMap = new Map<string, number>();
  const makeWordStartMap = (letters: string, word: string) => {
    if (word !== "") { // this is an annoying check to perform a million times
      // Stop generating more combinations if this start doesn't exist in the dictionary
      const count = getWordStartCount(word);
      if (count == 0) return;

      startMap.set(word, count);
    }
    
    for (let i = 0; i < letters.length; i++) {
      makeWordStartMap(letters.slice(0, i) + letters.slice(i + 1), word + letters[i]);
    }
  };
  makeWordStartMap(bag.pulledLetters, "");

  const sortedStartMap = new Map([...startMap.entries()].sort((a, b) => b[1] - a[1]));
  const validWords = [];
  const possibilities = new Map<number, number>();
  let longestWordStartLength = 0;
  let longestWordStart = "";
  let highestPossibility = 0;
  for (const [wordStart, count] of sortedStartMap) {
    // compile the valid words
    if (isWordFastUnsafe(wordStart)) {
      validWords.push(wordStart);
    }

    // add the number of possibilities from this word start at this length
    const length = wordStart.length;
    possibilities.set(length, (possibilities.get(length) ?? 0) + count);

    // update the best word start
    if (length > longestWordStartLength || count > highestPossibility) {
      highestPossibility = count;
      longestWordStartLength = length;
      longestWordStart = wordStart;
    }
  }

  // set the "best" combination to be the longest word start
  const best = longestWordStart;

  // remove the best word's letters from the bag
  for (let i = 0; i < best.length; i++) {
    bag.pulledLetters = bag.pulledLetters.replace(best[i], "");
  }
  // now put the best word at the start of the bag
  bag.pulledLetters = best + bag.pulledLetters;

  const endTime = Date.now();
  const timeTaken = formatNumber(endTime - startTime);

  // Generate random letters
  let letters = "";
  let emptyAt = 9999;
  for (let i = -1; i < bag.pulledLetters.length; i++) {
    letters = bag.pulledLetters.slice(0, i + 1);
    
    const possibilityCount = possibilities.get(letters.length) ?? 0;

    let content = "Rolling (generated in " + timeTaken + "ms).. Cost: " + pay + " cash\n\n";

    if (possibilityCount == 0 && i >= 0 && emptyAt == 9999) emptyAt = i;
    if (letters.length == letterCount) {
      if (possibilityCount > 0) {
        content += "JACKPOT! Payout: " + payout + " cash.\n";
        content += getPromptLetters(letters);

        addCash(interaction.user.id, payout);
      } else {
        content += "Better luck next time..\n";
        content += getNormalLetters(letters.substring(0, emptyAt)) + getAbsentLetters(letters.substring(emptyAt));
      }
    } else {
      if (i == -1) {
        content += "Possibilities: ...\n";
      } else {
        content += "Possibilities: " + formatNumber(possibilityCount) + "\n";
      }

      content += getNormalLetters(letters.substring(0, emptyAt)) + getAbsentLetters(letters.substring(emptyAt));
      content += getRollingEmoji(letters.length, letterCount - letters.length);
    }

    await sendMessage(interaction, content);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}