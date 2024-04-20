import { ActivityType, Channel, Client, GatewayIntentBits, Guild, GuildTextBasedChannel, Message, Partials } from "discord.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerClientAsCommandHandler } from "../../src/command-handler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const lameBotClient: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
  allowedMentions: { parse: ["users"] }
});

function updatePresence() {
  lameBotClient.user?.setPresence({
    activities: [
      {
        name: "1 game",
        type: ActivityType.Playing,
      },
    ],
    status: "online"
  });
  setTimeout(updatePresence, 86400000);
}

lameBotClient.on("ready", () => {
  console.log(`Logged in as ${lameBotClient.user?.tag}!`);
  updatePresence();
});

/**
 * Waits for the `lameBotClient` to become ready.
 */
export async function waitForReady(): Promise<void> {
  if (lameBotClient.readyAt) return;
  await new Promise((resolve) => {
    lameBotClient.once("ready", resolve);
  });
}

/**
 * Asynchronously retrieves the guild with the specified guild ID using Lame Bot.
 * 
 * @param guildID The ID of the guild
 * @returns A Promise that resolves to a Guild object if found, otherwise it resolves to undefined
 */
export async function getGuild(guildID: string): Promise<Guild | undefined> {
  await waitForReady();
  return lameBotClient.guilds.cache.get(guildID);
}

/**
 * Asynchronously retrieves the channel with the specified channel ID using Lame Bot.
 *
 * @param channelID The ID of the channel
 * @returns A Promise that resolves to a Channel object if found, otherwise it resolves to undefined
 */
export async function getChannel(channelID: string): Promise<Channel | undefined> {
  await waitForReady();
  return lameBotClient.channels.cache.get(channelID);
}

// async function to send a message to a channel and wait for it to be sent, retrying with backoff with a maximum length of 5 seconds
// yo this is VILE please god remove this
/**
 * This function sends a message to a given channel using Lame Bot. It will retry sending the message until it is successfully sent. If an error occurs while sending the message, the function will log the error and retry sending after a delay.
 * 
 * @param channel The channel to which we want to send a message
 * @param message The content of the message
 * @returns A promise that resolves to the sent message
 */
export async function sendMessage(channel: GuildTextBasedChannel | string, message: string): Promise<Message> {
  await waitForReady();

  if (typeof channel === "string") {
    // FIXME: see issue #84
    let queriedChannel = await getChannel(channel);

    // Throwing an error may now cause issues, but we'll see if this ever causes problems
    if (!queriedChannel) {
      throw new Error("Channel not found");
    }

    // Check if the channel is a GuildTextBasedChannel in the most hacky way possible
    if (!("send" in queriedChannel)) {
      throw new Error("Channel is not a GuildTextBasedChannel");
    }

    channel = queriedChannel as GuildTextBasedChannel;
  }

  let retryDelay = 500;
  while (true) {
    try {
      return await channel.send(message);
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      retryDelay = Math.min(retryDelay + 500, 5000);
    }
  }
}

// There must be a better way of making it known that this will retry sending the message until it is sent - it is not immediately obvious (same as the function above)

/**
 * This function sends a message as a reply to a given message using Lame Bot. It will retry sending the message until it is successfully sent. If an error occurs while sending the message, the function will log the error and retry sending after a delay.
 *
 * @param replyMessage The message to which we want to send a reply
 * @param message The content of the reply
 * @returns A promise that resolves to the sent message
 */
export async function sendMessageAsReply(replyMessage: Message, message: string): Promise<Message> {
  await waitForReady();

  let retryDelay = 500;
  while (true) {
    try {
      return await replyMessage.reply(message);
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      retryDelay = Math.min(retryDelay + 500, 5000);
    }
  }
}

//

registerClientAsCommandHandler(
  lameBotClient,
  path.join(__dirname, "../commands"),
  process.env.LAME_CLIENT_ID,
  process.env.LAME_TOKEN
);

//
