import { Client, Guild, GatewayIntentBits, Partials, ActivityType, Channel, Message, TextChannel, TextBasedChannel, GuildTextBasedChannel } from "discord.js";

import { registerClientAsCommandHandler } from "../../src/command-handler";
import path from "node:path";

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

export async function waitForReady(): Promise<void> {
  if (lameBotClient.readyAt) return;
  await new Promise((resolve) => {
    lameBotClient.once("ready", resolve);
  });
}

export async function getGuild(guildID: string): Promise<Guild | undefined> {
  await waitForReady();
  return lameBotClient.guilds.cache.get(guildID);
}

export async function getChannel(channelID: string): Promise<Channel | undefined> {
  await waitForReady();
  return lameBotClient.channels.cache.get(channelID);
}

// async function to send a message to a channel and wait for it to be sent, retrying with backoff with a maximum length of 5 seconds
// yo this is VILE please god remove this
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
