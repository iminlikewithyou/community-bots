import { EmojiMap, replaceTextWithLetterMap } from "../emoji-renderer";

interface HighlighterOptions {
  presentEmojiMap: EmojiMap;
  highlightedEmojiMap: EmojiMap;
  wildcardEmojiMap: EmojiMap;
}

export abstract class Highlighter {
  abstract getPresent(string: string): string;
  abstract getHighlighted(string: string): string;
  abstract getWildcard(string: string): string;

  /**
   * Converts a string to one with the letters converted into its highlighted form.
   * 
   * @param text A string to convert
   * @param regex A regex to use to highlight the string
   * @returns A string with the letters converted for highlighting
   */
  highlight(text: string, regex: RegExp): string {
    regex = setHighlightGroups(regex);
    const letters = getHighlightedLetters(text, regex);

    let emojiString = "";
    for (let text of letters) {
      switch (text.letterType) {
        case "highlighted":
          emojiString += this.getHighlighted(text.text);
          break;
        case "present":
          emojiString += this.getPresent(text.text);
          break;
        case "wildcard":
        default:
          emojiString += this.getWildcard(text.text);
          break;
      }
    }

    return emojiString;
  }
}

export class EmojiHighlighter extends Highlighter implements HighlighterOptions {
  presentEmojiMap: EmojiMap;
  highlightedEmojiMap: EmojiMap;
  wildcardEmojiMap: EmojiMap;

  constructor(options: HighlighterOptions) {
    super();
    this.presentEmojiMap = options.presentEmojiMap;
    this.highlightedEmojiMap = options.highlightedEmojiMap;
    this.wildcardEmojiMap = options.wildcardEmojiMap;
  }

  getPresent(string: string): string {
    return replaceTextWithLetterMap(string, this.presentEmojiMap);
  }

  getHighlighted(string: string): string {
    return replaceTextWithLetterMap(string, this.highlightedEmojiMap);
  }

  getWildcard(string: string): string {
    return replaceTextWithLetterMap(string, this.wildcardEmojiMap);
  }
}

class TextHighlighter extends Highlighter {
  getPresent(string: string): string {
    return string;
  }

  getHighlighted(string: string): string {
    return `**${string}**`;
  }

  getWildcard(string: string): string {
    return this.getHighlighted(string);
  }
}

import defaultPresentEmojiMap from "../../assets/emoji-maps/highlighters/default/present";
import defaultHighlightedEmojiMap from "../../assets/emoji-maps/highlighters/default/highlighted";
import defaultWildcardEmojiMap from "../../assets/emoji-maps/highlighters/default/wildcard";
const DefaultHighlighter = new EmojiHighlighter({
  presentEmojiMap: defaultPresentEmojiMap,
  highlightedEmojiMap: defaultHighlightedEmojiMap,
  wildcardEmojiMap: defaultWildcardEmojiMap
});

import viviPresentEmojiMap from "../../assets/emoji-maps/highlighters/vivi/present";
import viviHighlightedEmojiMap from "../../assets/emoji-maps/highlighters/vivi/highlighted";
import viviWildcardEmojiMap from "../../assets/emoji-maps/highlighters/vivi/wildcard";
import { getHighlightedLetters, setHighlightGroups } from "../regex";
/** This highlighter must be used when using Vivi from an installed application */
const ViviHighlighter = new EmojiHighlighter({
  presentEmojiMap: viviPresentEmojiMap,
  highlightedEmojiMap: viviHighlightedEmojiMap,
  wildcardEmojiMap: viviWildcardEmojiMap
});

export const Highlighters = {
  // Themes for OMG
  Default: DefaultHighlighter,

  // Highlighters for installed applications
  Vivi: ViviHighlighter,

  // Highlighters for testing
  Text: new TextHighlighter()
}