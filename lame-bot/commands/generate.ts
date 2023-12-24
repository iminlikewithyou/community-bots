import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { formatNumber } from "../../src/utils";
import { getAbsentLetters, getNormalLetters, getPromptLetters } from "../../src/emoji-renderer";
import { englishDictionary } from "../../src/dictionary/dictionary";

export const data = new SlashCommandBuilder()
  .setName("generate")
  .setDescription("Test command - generate letters")
  .addIntegerOption(option =>
    option
      .setName("amount")
      .setDescription("Amount of letters to generate")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(6)
  );

export const cooldown = 0;

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
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let bag = new Bag(defaultBag);

  // await interaction.deferReply();

  const letterCount = interaction.options.get("amount")?.value as number ?? 5;

  // const bet = 20;
  let payout = 0;

  async function updateRollMessage() {
    let content = "Rolling..\n\n";

    let pulledLetters = bag.pulledLetters;

    content += getNormalLetters(pulledLetters);
    content += getRollingEmoji(pulledLetters.length, letterCount - pulledLetters.length);

    if (interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply(content);
    }
  }

  await updateRollMessage();

  // Generate random letters
  let letters = "";
  for (let i = 0; i < letterCount; i++) {
    letters += bag.pullLetter();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await updateRollMessage();
  }

  await new Promise(resolve => setTimeout(resolve, 1500));

  // TODO
  // await updateMessage();

  const doesWordStartCombinationExist = (word: string) => {
    return new RegExp("^" + word + ".*$", "m").test(englishDictionary);
  };

  // Make every possible combination of words from the random letters
  const words = new Set<string>();
  const makeWords = (letters: string, word: string) => {
    // Stop generating more combinations if this start doesn't exist in the dictionary
    if (!doesWordStartCombinationExist(word)) return;

    words.add(word);
    
    for (let i = 0; i < letters.length; i++) {
      makeWords(letters.slice(0, i) + letters.slice(i + 1), word + letters[i]);
    }
  };
  makeWords(letters, "");
  words.delete(""); // Bandaid

  const startTime = Date.now();

  const dictionaryWordCount = words.size;

  const isWord = (word: string) => {
    return new RegExp("^" + word + "$", "m").test(englishDictionary);
  };

  // Check if any of the words are in the dictionary
  const validWords = [];
  words.forEach(word => {
    if (isWord(word)) {
      validWords.push(word);
    }
  });

  const endTime = Date.now();
  const timeTaken = endTime - startTime;

  // Sort words by length, then tile score
  // validWords.sort((a, b) => {
  //   if (b.length !== a.length) return b.length - a.length;

  //   let scoreA = 0;
  //   let scoreB = 0;
  //   for (let i = 0; i < a.length; i++) {
  //     scoreA += tileScores[a[i]];
  //   }
  //   for (let i = 0; i < b.length; i++) {
  //     scoreB += tileScores[b[i]];
  //   }
  //   return scoreB - scoreA;
  // });

  // sort by length
  validWords.sort((a, b) => b.length - a.length);

  // Sort words by tile score
  // validWords.sort((a, b) => {
  //   let scoreA = 0;
  //   let scoreB = 0;
  //   for (let i = 0; i < a.length; i++) {
  //     scoreA += tileScores[a[i]];
  //   }
  //   for (let i = 0; i < b.length; i++) {
  //     scoreB += tileScores[b[i]];
  //   }
  //   return scoreB - scoreA;
  // });

  const validWordCount = validWords.length;
  // const validWordCountString = formatNumber(validWordCount);

  // let highestScore = 0;

  // const wordsToShow = 10;
  // // Make a list of the top words
  // let topWords = validWords.slice(0, wordsToShow).map((word: string) => {
  //   if (word.length < letterCount - 1) return;
    
  //   let score = word.split("").reduce((acc, letter) => acc + tileScores[letter], 0);
  //   const multiplier = word.length === letterCount ? 3 : 1;
  //   let finalScore = Math.ceil(score * multiplier);
  //   if (finalScore > highestScore) highestScore = finalScore;

  //   return `${getPromptLetters(word)} ${score} points` + (multiplier > 1 ? ` x${multiplier} -> ${finalScore}` : "");
  // }).join("\n");

  // // Check if any of the words are in the dictionary
  // const validWords = words.filter(word => isWord(word));

  // let payout = Math.ceil(highestScore * (1 / 15) * bet);

  // await interaction.reply({
  //   content: 
  //     `${formatNumber(timeTaken)} ms\nBET: ${bet}\nPAYOUT: ${payout}\nPROFIT: ${payout - bet}\n\nROLL:\n${getNormalLetters(letters)}\n\n${validWordCountString} words, TOP RESULTS:\n${topWords}`
  // });

  // get the first word in the list
  const bestWord = validWords[0];

  // remove the best word from the bag
  for (let i = 0; i < bestWord.length; i++) {
    bag.pulledLetters = bag.pulledLetters.replace(bestWord[i], "");
  }

  let content = "Rolling..\n\n";

  if (bestWord.length == letterCount) {
    content += getPromptLetters(bestWord);
  } else {
    content += getNormalLetters(bestWord);
    content += getAbsentLetters(bag.pulledLetters);
  }

  await interaction.editReply(content);
}