import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { formatNumber } from "../../src/utils";
import { getNormalLetters, getPromptLetters } from "../../src/emoji-renderer";
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

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let letterBag = "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";
  // letterBag = letterBag + letterBag;

  // await interaction.deferReply();

  const amount = interaction.options.get("amount")?.value as number ?? 1;
  const bet = 15;

  // Generate random letters
  let letters = "";
  for (let i = 0; i < amount; i++) {
    const letter = letterBag[Math.floor(Math.random() * letterBag.length)];
    letters = letters + letter;
    // Remove letter from bag
    letterBag = letterBag.replace(letter, "");
  }

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

  // // Sort words by length
  // validWords.sort((a, b) => b.length - a.length);

  // Sort words by tile score
  validWords.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    for (let i = 0; i < a.length; i++) {
      scoreA += tileScores[a[i]];
    }
    for (let i = 0; i < b.length; i++) {
      scoreB += tileScores[b[i]];
    }
    return scoreB - scoreA;
  });

  const validWordCount = validWords.length;
  const validWordCountString = formatNumber(validWordCount);

  let highestScore = 0;

  const wordsToShow = 10;
  // Make a list of the top words
  let topWords = validWords.slice(0, wordsToShow).map((word: string) => {
    if (word.length < amount - 1) return;
    
    let score = word.split("").reduce((acc, letter) => acc + tileScores[letter], 0);
    const multiplier = word.length === amount ? 3 : 1;
    let finalScore = Math.ceil(score * multiplier);
    if (finalScore > highestScore) highestScore = finalScore;

    return `${getPromptLetters(word)} ${score} points` + (multiplier > 1 ? ` x${multiplier} -> ${finalScore}` : "");
  }).join("\n");

  // // Check if any of the words are in the dictionary
  // const validWords = words.filter(word => isWord(word));

  let payout = Math.ceil(highestScore * (1 / 15) * bet);

  await interaction.reply({
    content: 
      `${formatNumber(timeTaken)} ms\nBET: ${bet}\nPAYOUT: ${payout}\nPROFIT: ${payout - bet}\n\nROLL:\n${getNormalLetters(letters)}\n\n${validWordCountString} words, TOP RESULTS:\n${topWords}`
  });
}