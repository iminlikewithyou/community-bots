import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { replyToInteraction } from "../../src/command-handler";

export const data = new SlashCommandBuilder()
  .setName("bloxlink")
  .setDescription("Connect your Roblox account to Discord using Bloxlink!");

export const cooldown = 10 * 1000;
export const broadcastable = true;

export async function execute(interaction: ChatInputCommandInteraction, preferBroadcast: boolean) {
  await replyToInteraction(interaction, "Verify", "\n• Connect your Roblox account to Discord using Bloxlink [using this link](https://blox.link/dashboard/user/verifications/verify).", preferBroadcast);
}