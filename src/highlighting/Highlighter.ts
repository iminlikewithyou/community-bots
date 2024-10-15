import { CharacterMap, CharacterTheme } from "./CharacterSet";
import CaffeinatedCharacterTheme from "./highlighters/Caffeinated";
import ComicSansCharacterTheme from "./highlighters/ComicSans";
import DarkCharacterTheme from "./highlighters/Dark";
import DefaultCharacterTheme from "./highlighters/Default";
import GreenCharacterTheme from "./highlighters/Green";
import LifeboatCharacterTheme from "./highlighters/Lifeboat";
import LilacCharacterTheme from "./highlighters/Lilac";
import RoseCharacterTheme from "./highlighters/Rose";
import TextCharacterTheme from "./highlighters/Text";
import ViviCharacterTheme from "./highlighters/Vivi";
import { getHighlightedLetters, setHighlightGroups } from "../regex";
import { CommandInteraction } from "discord.js";
import { getHighlighterTheme } from "../database/db";

type HighlightingBots = "vivi" | "unknown";

export class Highlighter {
  theme: CharacterTheme;

  constructor(theme: CharacterTheme) {
    this.theme = theme;
  }

  /**
   * Maps a string to a new string using the provided map.
   * 
   * @param string The string to map
   * @param map The map to use when converting the string
   * @returns The mapped string
   */
  private mapText(string: string, map: CharacterMap, alternateMap?: { [key: string]: string }) {
    return string
      .toUpperCase()
      .split("")
      .map((letter) => {
        if (alternateMap && alternateMap[letter]) {
          return alternateMap[letter];
        }
        return map[letter] ?? map.unknown;
      })
      .join("");
  }

  /**
   * Applies the present highlight to a string.
   * 
   * @param string The string to get the present highlight for
   * @param spacesAreAny Whether spaces should be treated as wildcard any characters
   * @returns The string with the present highlight applied
   */
  getPresent(string: string, spacesAreAny: boolean = false): string {
    const alternateMap = spacesAreAny ? { " ": this.theme.Present.any } : undefined;
    return this.mapText(string, this.theme.Present, alternateMap);
  }

  /**
   * Applies the highlighted highlight to a string.
   * 
   * @param string The string to get the highlighted highlight for
   * @returns The string with the highlighted highlight applied
   */
  getHighlighted(string: string): string {
    return this.mapText(string, this.theme.Highlighted);
  }

  /**
   * Applies the wildcard highlight to a string.
   * 
   * @param string The string to get the wildcard highlight for
   * @returns The string with the wildcard highlight
   */
  getWildcard(string: string): string {
    return this.mapText(string, this.theme.Wildcard);
  }

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

  static fromName(name: string): Highlighter | undefined {
    return Highlighters[name];
  }

  static async fromServerInteraction(userID: string): Promise<Highlighter> {
    const highlighterTheme: string = await getHighlighterTheme(userID);
    return Highlighter.fromName(highlighterTheme) ?? DefaultHighlighter;
  }

  static async fromCommand(userID: string, guildID: string, fromBot: HighlightingBots): Promise<Highlighter> {
    // if (guildID !== process.env.GUILD_ID) {
    //   switch (fromBot) {
    //     case "vivi":
    //       return Highlighters.Vivi;
    //   }
    // }
    return Highlighter.fromServerInteraction(userID);
  }

  static async fromCommandInteraction(interaction: CommandInteraction, fromBot: HighlightingBots): Promise<Highlighter> {
    return Highlighter.fromCommand(interaction.user.id, interaction.guildId, fromBot);
  }
}

export const Highlighters = {
  // Themes for OMG
  Default: new Highlighter(DefaultCharacterTheme),
  Caffeinated: new Highlighter(CaffeinatedCharacterTheme),
  ComicSans: new Highlighter(ComicSansCharacterTheme),
  Dark: new Highlighter(DarkCharacterTheme),
  Green: new Highlighter(GreenCharacterTheme),
  Lifeboat: new Highlighter(LifeboatCharacterTheme),
  Lilac: new Highlighter(LilacCharacterTheme),
  Rose: new Highlighter(RoseCharacterTheme),

  // Highlighters for installed applications
  Vivi: new Highlighter(ViviCharacterTheme),

  // Highlighters for testing
  Text: new Highlighter(TextCharacterTheme)
}

/**
 * The default highlighter to use.
 * 
 * Change this if you're working locally and your bot doesn't have access to the emojis, when testing, or something else.
 */
export const DefaultHighlighter = Highlighters.Default;