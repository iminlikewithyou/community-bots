import crypto from "crypto";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getInteractionContent } from "../../src/command-handler";

export const data = new SlashCommandBuilder()
  .setName("createserver")
  .setDescription("Create a reserved server!")
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

export const broadcastable = true;

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

export async function execute(interaction: ChatInputCommandInteraction, preferBroadcast: boolean) {
  let gameName = interaction.options.get("game")?.name ?? "Word Bomb";

  let content = getInteractionContent(interaction, "Reserved Server",
    preferBroadcast ?
      "\n• Click to join <@" + interaction.user.id + ">'s [generated " + gameName + " server](" + getLink() + ")!" :
      "\n• Here's the link to your generated " + gameName + " server!\n\n" + getLink(),
    false);
  
  if (preferBroadcast) {
    await interaction.reply(content);
  } else {
    await interaction.reply( { content, ephemeral: true });
  }
}