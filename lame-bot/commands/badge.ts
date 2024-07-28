import { ChatInputCommandInteraction, CommandInteraction, GuildMemberRoleManager, Role, SlashCommandBuilder } from 'discord.js';
import sharp from 'sharp';
import { replyToInteraction } from '../../src/command-handler';
import { getProfile, setBoosterRole } from '../../src/database/db';
import { assignRole, createBoosterRole, renameRole, setRoleIcon } from '../../src/sleuth';
import { getCleanRoleName } from '../../src/utils';

export const data = new SlashCommandBuilder()
  .setName("badge")
  .setDescription("Various badge-related commands for boosters!")
  .addSubcommand(subcommand =>
    subcommand.setName("set")
      .setDescription("Set a booster badge for yourself!")
      .addAttachmentOption(option =>
        option.setName("icon")
          .setDescription("The icon to use")
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand.setName("name")
      .setDescription("Name your booster badge!")
      .addStringOption(option =>
        option.setName("name")
          .setDescription("The name to use for the badge")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(24)));

export const broadcastable = false;

export const cooldown = 90 * 1000; // Lol there's no way to fix this  LOL! Lol! Made a mistake? 90 SECOND COOLDOWN! LOL!

const boosterPositionRole = "1183517686232268904";
const boosterEndRole = "1267109693252309134";

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
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "name") {
    let name = interaction.options.get("name", true).value as string;
    let userRoles = interaction.member.roles as GuildMemberRoleManager;

    if (!isBooster(userRoles)) {
      await replyToInteraction(interaction, "Error", "\nYou must be a booster to use this command.", false);
      return;
    }

    let profile = await getProfile(interaction.user.id);
    profile.boosterRole = profile.boosterRole || "";

    if (!profile.boosterRole) {
      await replyToInteraction(interaction, "Error", "\nYou must set a booster badge first.", false);
      return;
    }

    let roles = interaction.guild.roles;
    let rolePos = roles.cache.get(boosterPositionRole).position;
    let endRolePos = roles.cache.get(boosterEndRole).position;
    let userBoosterRole = roles.cache.get(profile.boosterRole);

    const higherPosition = Math.max(rolePos, endRolePos);
    const lowerPosition = Math.min(rolePos, endRolePos);

    if (!userBoosterRole) {
      await replyToInteraction(interaction, "Error", "\nYour booster badge seems to be missing, please set it again.", false);
      return;
    }

    const newName = getCleanRoleName(name);
    if (!newName) {
      await replyToInteraction(interaction, "Error", "\nPlease provide a valid name for your badge.", false);
      return;
    }

    try {
      // check if other roles have this name (not including any booster roles)
      let existingRole = roles.cache.find((role) => {
        return role.name.toLowerCase() == newName.toLowerCase() && (role.position <= lowerPosition || role.position >= higherPosition);
      });
      if (existingRole) {
        await replyToInteraction(interaction, "Error", `\nA role with that name already exists.`, false);
        return;
      }
      await renameRole(userBoosterRole.id, newName);
    } catch (e) {
      console.error(e);
      await replyToInteraction(interaction, "Error", `\nFailed to name your role!`, false);
      return;
    }

    await replyToInteraction(interaction, "Booster Badge", "\nSuccessfully named your booster badge!", false);
  } else if (subcommand === "set") {
    let icon = interaction.options.get("icon", true).attachment;
    let userRoles = interaction.member.roles as GuildMemberRoleManager;

    // verbose errors D:
    if (interaction.guild.premiumTier < 2) {
      // this is mainly to prevent people from using this while the server doesnt have
      // the correct boost level and casuing a ton of errors
      await replyToInteraction(interaction, "Error", "\nYou can't use booster roles yet, the server must be at least level 2!", false);
      return;
    }

    if (!isBooster(userRoles)) {
      await replyToInteraction(interaction, "Error", "\nYou must be a booster to use this command.", false);
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
        await replyToInteraction(interaction, "Error", "\nPlease use a valid image type.", false);
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
        userBoosterRole = await createBoosterRole(
          validateUserName(interaction.user.username) + " booster icon",
          rolePos + 1,
          iconResized,
          interaction.user.id
        );

        setBoosterRole(interaction.user.id, userBoosterRole.id);
      } catch (e) {
        console.error(e);
        await replyToInteraction(interaction, "Error", `\nFailed to create your role!\nTry again later.`, false);
        return;
      }
    }

    if (!userRoles.cache.has(userBoosterRole.id)) {
      try {
        await assignRole(interaction.user.id, userBoosterRole.id);
      } catch (e) {
        console.error(e);
        await replyToInteraction(interaction, "Error", `\nFailed to add you to the role!\nTry again later.`, false);
        return;
      }
    }

    await replyToInteraction(interaction, "Booster Badge", "\nSuccessfully set your booster badge!", false);
  }
}