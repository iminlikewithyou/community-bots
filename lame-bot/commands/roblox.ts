import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { replyToInteraction } from "../../src/command-handler";
import { escapeDiscordMarkdown } from "../../src/utils";

export const data = new SlashCommandBuilder()
  .setName("roblox")
  .setDescription("View a user's Roblox profile!")
  .addUserOption(option =>
    option.setName("user")
      .setDescription("The user to view the profile of")
      .setRequired(false)); 

export const cooldown = 10 * 1000;
export const broadcastable = true;

export async function execute(interaction: ChatInputCommandInteraction, preferBroadcast: boolean) {
  const userID = interaction.options.getUser("user")?.id ?? interaction.user.id;
  try {
    const result = await fetch(`https://api.blox.link/v4/public/guilds/476593983485902850/discord-to-roblox/${userID}`, { headers: { "Authorization": process.env.BLOXLINK_KEY } });
    const data = await result.json();
    if (data.error) {
      const errorMessage = data.error.endsWith(".") ? data.error : data.error + ".";
      await replyToInteraction(interaction, "Profile", "\n• " + escapeDiscordMarkdown(errorMessage), preferBroadcast);
      return;
    }

    const robloxInformation = data.resolved.roblox;

    const robloxName = robloxInformation.displayName ?? robloxInformation.name;
    const robloxUsername = robloxInformation.name;
    const robloxLink = robloxInformation.profileLink;
    const robloxDescription = robloxInformation.description;
    
    // oh my goodness
    let robloxImage = null;
    if (robloxInformation.avatar) {
      if (robloxInformation.avatar.fullBody) {
        const imageData = await (await fetch(robloxInformation.avatar.fullBody)).json();
        if (imageData.data && imageData.data[0] && imageData.data[0].imageUrl) {
          robloxImage = imageData.data[0].imageUrl;
        }
      }
    }

    const text = `<@${userID}> is **${robloxName}** on Roblox.`;
    const embed = new EmbedBuilder()
      .setAuthor({ name: "@" + robloxUsername })
      .setTitle(robloxName)
      .setURL(robloxLink)
      .setDescription(robloxDescription)
      .setThumbnail(robloxImage)
      .setColor("#00a8ff");
    
    await replyToInteraction(interaction, "Profile", "\n" + text + "\n** **", preferBroadcast, {
      allowedMentions: { parse: [] },
      embeds: [embed]
    });
  } catch (error) {
    console.error(error);
    await replyToInteraction(interaction, "Profile", "\n• An error occurred while fetching the profile.", false);
  }
}