import { ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { escapeDiscordMarkdown, formatNumber } from "../../src/utils";
import { replyToInteraction } from "../../src/command-handler";
import { getCash, setCashName } from "../../src/database/db";

export const data = new SlashCommandBuilder()
  .setName("namecurrency")
  .setDescription("Set your currency name!")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("before")
      .setDescription("Set your currency name, appearing before the amount!")
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The text to add - no spaces, must end with a symbol like $")
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(7)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("after")
      .setDescription("Set your currency name, appearing after the amount!")
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The text to add - two words max")
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(18)
      )
  )

export const cooldown = 8 * 1000;
export const type = ["fun"];

const CURRENCY_SYMBOLS = "$£€¥₩₽₴₹₱₿¢#";
const NO_SPACE_SYMBOLS = "$£¢";

const FAILING_REGEX = new RegExp(`[^A-Z ${CURRENCY_SYMBOLS}\-\?]`, "gi");

export async function execute(interaction: ChatInputCommandInteraction, _preferBroadcast: boolean) {
  let subcommand = interaction.options.getSubcommand();
  let text = interaction.options.getString("text") as string;
  let appearsBeforeAmount = subcommand === "before";

  // remove leading and trailing spaces
  text = text.trim();
  // remove double spaces
  text = text.replace(/\s\s+/g, " ");
  // remove double dashes
  text = text.replace(/\-\-/g, "-");

  // enforce proper capitalization
  // in every single word of the text, there must be an uppercase letter anywhere
  let words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    let hasUppercase = false;
    for (let j = 0; j < word.length; j++) {
      // ignore if it's not a letter
      if (!word[j].match(/[a-z]/i)) continue;
      if (word[j] === word[j].toUpperCase()) {
        hasUppercase = true;
        break;
      }
    }
    if (!hasUppercase) {
      words[i] = word[0].toUpperCase() + word.slice(1);
    }
  }
  text = words.join(" ");

  // replace invalid characters with nothing
  text = text.replace(FAILING_REGEX, "");

  // if the text is empty, reply with an error
  if (text.length === 0) {
    await replyToInteraction(
      interaction,
      "Name Currency",
      "\n• Invalid name.",
      false
    );
    return;
  }

  if (appearsBeforeAmount) {
    // no spaces allowed
    if (text.includes(" ")) {
      await replyToInteraction(
        interaction,
        "Name Currency",
        "\n• You cannot have spaces in text that appears before the amount!",
        false
      );
      return;
    }

    // if it doesn't end with a symbol, error
    if (!CURRENCY_SYMBOLS.includes(text.slice(-1))) {
      await replyToInteraction(
        interaction,
        "Name Currency",
        "\n• You must end the text with a symbol like $!",
        false
      );
      return;
    }
  } else {
    // two words max
    if (text.split(" ").length > 2) {
      await replyToInteraction(
        interaction,
        "Name Currency",
        "\n• You can only enter two words maximum!",
        false
      );
      return;
    }

    // add a space at the beginning if it doesn't start with a "no space symbol"
    if (!NO_SPACE_SYMBOLS.includes(text[0])) {
      text = " " + text;
    }
  }

  // set the currency name
  await setCashName(interaction.user.id, text, appearsBeforeAmount);
  // get the currency
  let currency = await getCash(interaction.user.id);

  replyToInteraction(
    interaction,
    "Name Currency",
    "\nSet your currency name!"
    + "\nYou have " + escapeDiscordMarkdown(currency.displayAmount) + ".",
    false
  );
}