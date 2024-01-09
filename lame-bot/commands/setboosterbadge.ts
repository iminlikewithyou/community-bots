import { ChatInputCommandInteraction, GuildMemberRoleManager, Role, SlashCommandBuilder } from 'discord.js';
import sharp from 'sharp';
import { replyToInteraction } from '../../src/command-handler';
import { getProfile, setBoosterRole } from '../../src/database/db';
import { assignRole, createBoosterIcon, setRoleIcon } from '../../src/sleuth';

export const data = new SlashCommandBuilder()
  .setName("setboosterbadge")
  .setDescription("Set a booster badge for yourself!")
  .addAttachmentOption(option => 
    option.setName("icon")
      .setDescription("The icon to use")
      .setRequired(true));
  // .addUserOption(option => 
  //   option.setName("user")
  //   .setDescription("The user to set the badge for (owner only)")
  //   .setRequired(false))

export const broadcastable = false;

export const cooldown = 90 * 1000;

const boosterPositionRole = "1183517686232268904";

const validateUserName = (name: string, _id?: string) => {
  let validated = "";
  // . and _ are the only special characters allowed in usernames, they look ugly
  // and the likelyhood we'll have a name collision is low enough that we can get away with this
  validated = name.replace(/[\.\_]/g, "");
  
  validated += name.endsWith("s") ? "'" : "'s";

  return validated
}

const isBooster = (rolelist: GuildMemberRoleManager): boolean => {
  return !!rolelist.premiumSubscriberRole;
}

export async function execute(interaction: ChatInputCommandInteraction, _preferBroadcast: boolean) {
  let icon = interaction.options.get("icon", true).attachment;
  let userRoles = interaction.member.roles as GuildMemberRoleManager;
  
  // verbose errors D:
  if (interaction.guild.premiumTier < 2) {
    // this is mainly to prevent people from using this while the server doesnt have
    // the correct boost level and casuing a ton of errors
    replyToInteraction(interaction, "Error", "\nYou can't use booster roles yet, the server must be at least level 2!", false);
    return;
  }

  if (!isBooster(userRoles)) {
    replyToInteraction(interaction, "Error", "\nYou must be a booster to use this command.", false);
    return;
  }

  let profile = await getProfile(interaction.user.id);
  profile.boosterRole = profile.boosterRole || "";

  switch (icon.contentType) {
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      break;
    default:
      replyToInteraction(interaction, "Error", "\nPlease use a valid image type.", false);
      return;
  }

  let iconBuf = await (await fetch(icon.proxyURL).then(res => res.blob())).arrayBuffer();
  let iconResized = await sharp(iconBuf).resize({ width: 64, height: 64, fit: "outside" }).png().toBuffer();
  
  let roles = interaction.guild.roles;
  let rolePos = roles.cache.get(boosterPositionRole).position;

  let userBoosterRole: Role;
  let roleUpdated = false;

  if (profile.boosterRole) {
    userBoosterRole = roles.cache.get(profile.boosterRole);

    if (userBoosterRole) {
      // tbh if this edit fails we can just cope and move on
      setRoleIcon(userBoosterRole.id, iconResized);

      roleUpdated = true;
    }

    // if the role is missing, we'll need to create a new one
  }

  if (!roleUpdated) {
    // TRY CATCH :HAHAHAHA:
    try {
      userBoosterRole = await createBoosterIcon(
        validateUserName(interaction.user.username) + " booster icon",
        rolePos + 1,
        iconResized,
        interaction.user.id
      );

      setBoosterRole(interaction.user.id, userBoosterRole.id);
    } catch (e) {
      console.error(e);
      replyToInteraction(interaction, "Error", `\nFailed to create your role!\nTry again later.`, false);
      return;
    }
  }

  if (!userRoles.cache.has(userBoosterRole.id)) {
    try {
      await assignRole(interaction.user.id, userBoosterRole.id);
    } catch (e) {
      console.error(e);
      replyToInteraction(interaction, "Error", `\nFailed to add you to the role!\nTry again later.`, false);
      return;
    }
  }

  replyToInteraction(interaction, "Booster Badge", "\nSuccessfully set your booster badge!", false);
}