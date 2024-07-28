import { ActivityType, Client, GatewayIntentBits, Role } from 'discord.js';
import { formatNumberShorthand } from './utils';

export const sleuthClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ],
  allowedMentions: { parse: ['users'] }
});

function updatePresence() {
  let memberCount = sleuthClient.guilds.cache.get(process.env.GUILD_ID).memberCount;
  let displayCount = formatNumberShorthand(memberCount);

  sleuthClient.user.setPresence({
    activities: [{
      name: displayCount + ' members',
      type: ActivityType.Watching
    }],
    status: 'dnd'
  });
  setTimeout(updatePresence, 1000 * 60 * 20); // 20 MINUTES
}

/**
 * Create a role at a specified position with a specified icon using Sleuth.
 * 
 * **IMPORTANT NOTES:**
 * This function does not assign the role to the user.
 * This function does not resize the provided icon.
 * This function does not check if the user already has a booster icon role.
 * This function does not check if the server has reached Boost Level 2.
 * 
 * It is unknown if the icon must be resized before being passed to this function, but it is highly recommended.
 * A Discord role icon must be a PNG, JPEG, or WEBP image with a maximum size of 256 KB.
 *
 * @param name The name of the role
 * @param rolePos The position of the booster role
 * @param iconResized The resized buffer of the icon
 * @param userID The user ID (not actually utilized by this method)
 * @returns A promise that resolves to the created role
 */
export async function createBoosterRole(name: string, rolePos: number, iconResized: Buffer, userID: string): Promise<Role> {
  let userBoosterRole = await sleuthClient.guilds.cache.get(process.env.GUILD_ID).roles.create({
    name: name,
    position: rolePos,
    icon: iconResized
  });

  return userBoosterRole;
}

/**
 * Add a role to a user using Sleuth.
 * 
 * @param userID The user ID
 * @param roleID The role ID
 */
export async function assignRole(userID: string, roleID: string): Promise<void> {
  let guild = sleuthClient.guilds.cache.get(process.env.GUILD_ID);
  let member = guild.members.cache.get(userID);

  await member.roles.add(roleID);
}

export async function renameRole(roleID: string, newName: string) {
  await sleuthClient.guilds.cache.get(process.env.GUILD_ID).roles.cache.get(roleID).setName(newName);
}

/**
 * Set the icon of a role using Sleuth.
 * 
 * **IMPORTANT NOTES:**
 * This function does not resize the provided icon.
 * This function does not check if the server has reached Boost Level 2.
 * 
 * It is unknown if the icon must be resized before being passed to this function, but it is highly recommended.
 * A Discord role icon must be a PNG, JPEG, or WEBP image with a maximum size of 256 KB.
 * 
 * @param userID The user ID
 * @param roleID The role ID
 */
export async function setRoleIcon(roleID: string, icon: Buffer) {
  await sleuthClient.guilds.cache.get(process.env.GUILD_ID).roles.cache.get(roleID).setIcon(icon);
}

sleuthClient.on('ready', () => {
  console.log(`Logged in as ${sleuthClient.user.tag}!`);
  updatePresence();
});

// log in

sleuthClient.login(process.env.SLEUTH_TOKEN);