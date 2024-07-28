import remarkEmojiMap from "../assets/emoji-maps/remarkEmojis";
import streakNumbersMap from "../assets/emoji-maps/streakNumbers";

export type EmojiMap = { [key: string]: string | string[] };

/**
 * This function takes an emoji and an emojiMap as arguments and returns the corresponding emoji from the emojiMap.
 * If the emojiMap defines the emoji as an array, a random emoji from the array is returned.
 * If the emoji does not exist in the emojiMap, the value associated with the "unknown" key in the emojiMap is returned.
 *
 * @param emoji The emoji to search for in the emoji map
 * @param emojiMap The map object that maps emojis to their respective values
 * @returns The string representation of the emoji from the emojiMap, or an empty string if no emoji was found
 */
export function getEmojiFromMap(emoji: string, emojiMap: EmojiMap): string {
  let value = emojiMap[emoji];
  if (value) {
    // if the emoji is a string, return it
    if (typeof value === "string") {
      return value;
    }

    // if the emoji is an array, return a random emoji from the array
    if (Array.isArray(emojiMap[emoji])) {
      return emojiMap[emoji][
        Math.floor(Math.random() * emojiMap[emoji].length)
      ];
    }
  }

  // return unknown from the emojiMap if it exists, otherwise return empty string
  if (emojiMap.unknown && typeof emojiMap.unknown === "string") return emojiMap.unknown;
  return "";
}

/**
 * Replaces every letter in the given string with an emoji from the provided letter map.
 * 
 * The letters in the string are converted to uppercase before being replaced.
 *
 * @param string The input string
 * @param letterMap A map of letters to emojis
 * @returns The resulting string with letters replaced by emojis
 */
export function replaceTextWithLetterMap(string: string, letterMap: EmojiMap): string {
  // replace every letter in the string with an emoji from the letterMap
  return string
    .toUpperCase()
    .split("")
    .map((letter) => {
      return getEmojiFromMap(letter, letterMap);
    })
    .join("");
}

/**
 * Returns the emoji associated with a given remark.
 * This calls getEmojiFromMap with the remarkEmojiMap.
 *
 * @param emoji The emoji to retrieve from the map
 * @returns The emoji associated with the given remark, or an empty string if the emoji does not exist
 */
export function getRemarkEmoji(emoji: string): string {
  return getEmojiFromMap(emoji, remarkEmojiMap);
}

/**
 * Returns the "streak numbers" of a given number.
 * This calls replaceTextWithLetterMap with the streakNumbersMap.
 *
 * @param number The number to be converted into streak numbers
 */
export function getStreakNumbers(number: number): string {
  return replaceTextWithLetterMap(number.toString(), streakNumbersMap);
}
