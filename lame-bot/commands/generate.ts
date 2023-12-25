import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { formatNumber } from "../../src/utils";
import { getAbsentLetters, getNormalLetters, getPromptLetters } from "../../src/emoji-renderer";
import { englishDictionary, englishStartMapStrings, isWordFastUnsafe } from "../../src/dictionary/dictionary";
import { addCash, getCash, spendCash } from "../../src/database/db";
import { replyToInteraction } from "../../src/command-handler";

export const data = new SlashCommandBuilder()
  .setName("generate")
  .setDescription("Test command - generate letters")
  .addStringOption((option) =>
    option
      .setName("letters")
      .setDescription("The number of letters to generate (3-7)")
  );

export const cooldown = 6 * 1000;

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
  if (interaction.replied || interaction.deferred) {
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

const baseCostPerSlot = 20;
const increasePerExtraSlot = 10;

const curveMin = 26; // 25
const curveMax = 146; // 180
const midpoint = 5.3;
const steepness = 1.9;

function getPayoutAt(letterCount: number) {
  return Math.floor(curveMin + (curveMax - curveMin) / (1 + Math.exp(-steepness * (letterCount - midpoint))));
}

function getRandomPayout() {
  return Math.floor(Math.random() * 12);
}

class Slot {
  // set variables
  letterCount: number;
  
  // generated
  pulledLetters: string;
  possibilities: Map<number, number>;
  failsAt: number;
  payout: number;

  constructor(letterCount: number) {
    let bag = new Bag(defaultBag);
    bag.pullLetters(letterCount);

    this.pulledLetters = bag.pulledLetters;
    this.letterCount = letterCount;
  }

  run() {
    // go through the word start map and find the most favorable word starts for the letters
    let map = englishStartMapStrings[this.letterCount];
    const getWordStartCount = (word: string) => {
      const regexp = new RegExp("^(\\d*)\\t" + word + "$", "m");
      
      // get the number from the capturing group
      const match = regexp.exec(map);
      
      // if there is no match, there are no words which start with this word
      if (!match) return 0;
  
      // return the number of words which start with this word
      const number = parseInt(match[1]);
      return number;
    }

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
    makeWordStartMap(this.pulledLetters, "");

    const sortedStartMap = new Map([...startMap.entries()].sort((a, b) => b[1] - a[1]));
    // const validWords = [];
    this.possibilities = new Map<number, number>();
    let longestWordStartLength = 0;
    let longestWordStart = "";
    let highestPossibility = 0;
    for (const [wordStart, count] of sortedStartMap) {
      // compile the valid words
      // if (isWordFastUnsafe(wordStart)) {
      //   validWords.push(wordStart);
      // }

      // add the number of possibilities from this word start at this length
      const length = wordStart.length;
      this.possibilities.set(length, (this.possibilities.get(length) ?? 0) + count);

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
      this.pulledLetters = this.pulledLetters.replace(best[i], "");
    }
    // now put the best word at the start of the bag
    this.pulledLetters = best + this.pulledLetters;

    // calculate if this word fails or not
    this.failsAt = best.length === this.letterCount ? undefined : best.length;

    if (this.failsAt) {
      this.payout = 0;
    } else {
      let payout = getPayoutAt(this.letterCount) + getRandomPayout();

      this.payout = payout;
    }
  }
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  const startTime = Date.now();

  // const slot1 = interaction.options.get("slot1")?.value as number;
  // const slot2 = interaction.options.get("slot2")?.value as number;
  // const slot3 = interaction.options.get("slot3")?.value as number;
  // const slot4 = interaction.options.get("slot4")?.value as number;

  const slotString = interaction.options.get("letters")?.value as string;
  
  // separate the string into numbers
  let usedSlots: number[];
  if (slotString) {
    try {
      usedSlots = slotString.replace(/\s,\//g, "").split("").map((value) => parseInt(value));
    } catch (error) {
      await replyToInteraction(
        interaction,
        "Generate",
        "\n• Invalid slot numbers.",
        false
      );
      return;
    }
  } else {
    usedSlots = [5];
  }

  if (usedSlots.some((value) => value < 3 || value > 7)) {
    await replyToInteraction(
      interaction,
      "Generate",
      "\n• Your slots must be between 3 and 7 letters long.",
      false
    );
    return;
  }

  if (usedSlots.length > 4) {
    await replyToInteraction(
      interaction,
      "Generate",
      "\n• You can only generate up to 4 slots.",
      false
    );
    return;
  }
  
  const adjustedCostPerSlot = increasePerExtraSlot * (usedSlots.length - 1) + baseCostPerSlot;
  const multiplier = adjustedCostPerSlot / baseCostPerSlot;
  const roundedCostPerSlot = Math.floor(adjustedCostPerSlot);
  const totalPay = roundedCostPerSlot * usedSlots.length;
  let roundedMultiplier = Math.round(multiplier * 10) / 10;

  let userCash = await getCash(interaction.user.id);
  if (userCash < totalPay) {
    await replyToInteraction(
      interaction,
      "Generate",
      "\n- You need " + totalPay + " cash for that. You have " + formatNumber(userCash) + " cash.\n - " + roundedCostPerSlot + " per slot at " + roundedMultiplier + "x payout",
      false
    );
    return;
  }
  await spendCash(interaction.user.id, totalPay);

  await interaction.deferReply();

  const slots = usedSlots.map((value) => new Slot(value));
  const highestLetterCount = Math.max(...slots.map((slot) => slot.letterCount));

  // space this out so that it doesn't hang the bot later
  slots.forEach((slot) => slot.run());
  slots.forEach((slot) => {
    slot.payout = Math.ceil(slot.payout * multiplier);
  });

  // calculate the total payout
  let totalPayout = 0;
  slots.forEach((slot) => {
    totalPayout += slot.payout;
  });

  const endTime = Date.now();
  const timeTaken = formatNumber(endTime - startTime);

  for (let i = -1; i < highestLetterCount; i++) {
    let content = "Rolling for " + totalPay + " cash • **" + roundedMultiplier + "x**..";

    if (i == highestLetterCount - 1) {
      let net = totalPayout - totalPay;
      content += " **" + (net > 0 ? "+" : "") + net + " cash**";
    }

    content += "\n\n";

    for (let j = 0; j < slots.length; j++) {
      const slot = slots[j];

      const letters = slot.pulledLetters.slice(0, i + 1);
      const possibilityCount = slot.possibilities.get(letters.length) ?? 0;

      let slotDead = slot.failsAt && i >= slot.failsAt;
      let slotComplete = letters.length == slot.letterCount;

      if (slotComplete && !slotDead) {
        content += getPromptLetters(letters);
      } else {
        if (slot.failsAt) {
          content += getNormalLetters(letters.substring(0, slot.failsAt)) + getAbsentLetters(letters.substring(slot.failsAt));
        } else {
          content += getNormalLetters(letters);
        }

        // add rolling emojis for the remaining letters
        content += getRollingEmoji(letters.length, slot.letterCount - letters.length);
      }

      if (slotComplete) {
        content += " • $" + (slot.payout > 0 ? slot.payout + " • **JACKPOT!!**" : "0");
      } else {
        content += " • " + formatNumber(possibilityCount) + " possibilit" + (possibilityCount == 1 ? "y" : "ies");
      }
      
      content += "\n";
    }

    await sendMessage(interaction, content);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // add the cash
  await addCash(interaction.user.id, totalPayout);
  
  // about 0.2131147541 chance of payout
}