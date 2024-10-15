import { CharacterTheme, PresentCharacterMap } from "../highlighting/CharacterSet";
import { Highlighter, Highlighters } from "../highlighting/Highlighter";

const nameMap: PresentCharacterMap = {
  " ": "Blank",
  "A": "LetterA",
  "B": "LetterB",
  "C": "LetterC",
  "D": "LetterD",
  "E": "LetterE",
  "F": "LetterF",
  "G": "LetterG",
  "H": "LetterH",
  "I": "LetterI",
  "J": "LetterJ",
  "K": "LetterK",
  "L": "LetterL",
  "M": "LetterM",
  "N": "LetterN",
  "O": "LetterO",
  "P": "LetterP",
  "Q": "LetterQ",
  "R": "LetterR",
  "S": "LetterS",
  "T": "LetterT",
  "U": "LetterU",
  "V": "LetterV",
  "W": "LetterW",
  "X": "LetterX",
  "Y": "LetterY",
  "Z": "LetterZ",
  "0": "Number0",
  "1": "Number1",
  "2": "Number2",
  "3": "Number3",
  "4": "Number4",
  "5": "Number5",
  "6": "Number6",
  "7": "Number7",
  "8": "Number8",
  "9": "Number9",
  "@": "SpecialAt",
  "-": "SpecialHyphen",
  "'": "SpecialApostrophe",

  "unknown": "SpecialHyphen",
  "any": "Blank",
};

// create an array from the keys in the type CharacterTheme
// type CharacterKey = keyof CharacterTheme;
// const keys: CharacterKey[] = ["Present", "Highlighted", "Wildcard"];

function getName(character: keyof PresentCharacterMap): string {
  if (character in nameMap) {
    return nameMap[character];
  }
  return "SpecialHyphen";
}

function getEmojiMatch(emoji: string): RegExpMatchArray | null {
  return emoji.match(/<(a?)?:(\w+):(\d{18})>?/);
}

function getIDFromEmoji(emoji: string): string | undefined {
  const match = getEmojiMatch(emoji);
  if (match) return match[3];
}

function isEmoji(content: string): boolean {
  return getEmojiMatch(content) !== null;
}

export function getAllEmojiNames(): Set<string> {
  const emojiNames = new Set<string>();
  for (const [highlighterName, highlighter] of Object.entries(Highlighters)) {
    const theme = highlighter.theme;
    for (const [keyType, keys] of Object.entries(theme)) {
      for (const [key, content] of Object.entries(keys)) {
        if (!isEmoji(content as string)) continue;
        const keyName = getName(key as keyof PresentCharacterMap);
        const fullName = `${highlighterName}${keyType}${keyName}`;
        const finalName = fullName.slice(0, 32);
        emojiNames.add(finalName);
      }
    }
  }
  return emojiNames;
}