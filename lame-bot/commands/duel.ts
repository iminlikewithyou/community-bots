import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { getInteractionContent, replyToInteraction } from "../../src/command-handler";
import crypto from "crypto";

export const data = new SlashCommandBuilder()
  .setName("duel")
  .setDescription("Send a duel request to another member!")
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to send the duel request to')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('game')
      .setDescription('The game to generate a server for')
      .addChoices(
        {
          name: 'Word Bomb',
          value: 'WordBomb'
        }
      )
      .setRequired(false));

// export const cooldown = 8 * 1000;
// export const type = ["fun", "annoying"];

export const limits = [];
limits[0] = {
  max: 1,
  interval: 2 * 60 * 1000,
  includeBotsChannel: true
};
limits[1] = {
  max: 2,
  interval: 4 * 60 * 1000,
  includeBotsChannel: true
};
limits[2] = {
  max: 3,
  interval: 6 * 60 * 1000,
  includeBotsChannel: true
};

export function getLink() {
  const uuid = crypto.randomUUID();
  return "<https://www.roblox.com/games/start?placeId=2653064683&launchData=" + uuid + ">";
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let user = interaction.options.get("user").user;
  let gameName = interaction.options.get("game")?.name ?? "Word Bomb";

  if (user === interaction.user) {
    await replyToInteraction(interaction, "Duel", "\n• You can't duel yourself!", false);
    return;
  }

  let link = getLink();

  try {
    let dmChannel = await user.createDM();
    await dmChannel.send(
      getInteractionContent(interaction, "Duel",
        "\n<@" + interaction.user.id + "> invited you to a duel for " + gameName + "!" +
        "\nClick to join the [reserved server](" + link + ").",
      false)
    );
  } catch (err) {
    console.error(err);
    await replyToInteraction(interaction, "Duel", "\n• Sorry, I couldn't send a DM to that user!", false);
    return;
  }
  
  await replyToInteraction(interaction, "Duel", "\n• Sent a duel request to <@" + user.id + ">!\nClick to join the [reserved server](" + link + ").", false);
}