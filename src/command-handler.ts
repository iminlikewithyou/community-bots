import { REST } from "@discordjs/rest";
import {
  ChannelType,
  Client,
  Collection,
  CommandInteraction,
  Events,
  GuildMember,
  GuildTextBasedChannel,
  InteractionReplyOptions,
  Message,
  MessageMentionOptions,
  Routes,
} from "discord.js";
import fs from "node:fs";
import { escapeDiscordMarkdown } from "./utils";

const COOLDOWN_TIME = 2000;
const commandCooldown = new Map();

const commandUses = new Map();
const commandLimitEnd = new Map();

type CommandLimit = {
  max: number | false;
  interval: number;
  includeBotsChannel: boolean;
};

type BaseCommand = {
  cooldown: number;
  limits?: CommandLimit[];
  tags?: string[];
};

type BotCommand = BaseCommand & {
  data: any;
  execute: (
    interaction: any,
    preferBroadcast: boolean
  ) => Promise<void | boolean>;
};

type MentionCommand = BaseCommand & {
  NAME_DUMB: string; // temporarily required
  matches: (text: string) => boolean;
  execute: (message: Message, text: string) => Promise<void>;
};

function commandToBroadcastOption(command: BotCommand) {
  return { type: 1, ...command };
}

function isOnCooldown(userID: string, commandName = "") {
  return getCooldown(userID, commandName) > 0;
}

function getCooldown(userID: string, commandName = "") {
  return Math.max(
    (commandCooldown.get(userID + commandName) || 0) - Date.now(),
    0
  );
}

function setOnCooldown(userID: string, commandName: string, cooldown: number) {
  commandCooldown.set(userID, Date.now() + COOLDOWN_TIME);
  if (commandName && cooldown)
    commandCooldown.set(userID + commandName, Date.now() + cooldown);
}

function getMemberLevel(member: GuildMember) {
  if (member.roles.cache.find((role) => role.name === "reliable")) return 2;
  if (member.roles.cache.find((role) => role.name === "regular")) return 1;
  return 0;
}

function getCommandLimitsFor(
  member: GuildMember,
  command: BaseCommand
): CommandLimit {
  if (!command.limits) return undefined;
  const memberLevel = getMemberLevel(member);
  let limit: CommandLimit;
  for (let i = 0; i < command.limits.length; i++) {
    if (memberLevel >= i) limit = command.limits[i];
  }
  if (!limit) return undefined;
  if (limit.max === false) return undefined;
  return limit;
}

function areLimitsIgnored(limit: CommandLimit, channel: GuildTextBasedChannel) {
  if (channel.guildId !== process.env.GUILD_ID) return true;
  if (limit.includeBotsChannel) return false;
  return (
    channel.name.toLowerCase().includes("roll") || isBroadcastChannel(channel)
  );
}

function isCommandLimited(
  member: GuildMember,
  command: BaseCommand,
  commandName: string,
  channel: GuildTextBasedChannel
) {
  let limits = getCommandLimitsFor(member, command);
  if (!limits) return false;

  if (areLimitsIgnored(limits, channel)) return false;

  let limitEnd = commandLimitEnd.get(member.id + commandName);
  if (limitEnd) {
    if (limitEnd < Date.now()) return false;

    let uses = commandUses.get(member.id + commandName);
    if (uses >= limits.max) return true;
  }

  return false;
}

function getLimitTime(member: GuildMember, commandName: string) {
  let limitEnd = commandLimitEnd.get(member.id + commandName);
  return Math.max(limitEnd - Date.now(), 0);
}

function addLimits(
  member: GuildMember,
  command: BaseCommand,
  commandName: string,
  channel: GuildTextBasedChannel
) {
  let limits = getCommandLimitsFor(member, command);
  if (!limits) return;

  if (areLimitsIgnored(limits, channel)) return false;

  let limitEnd = commandLimitEnd.get(member.id + commandName);
  if (limitEnd) {
    if (limitEnd < Date.now()) {
      commandLimitEnd.set(
        member.id + commandName,
        Date.now() + limits.interval
      );
      commandUses.set(member.id + commandName, 0);
    }
  } else {
    commandLimitEnd.set(member.id + commandName, Date.now() + limits.interval);
  }

  commandUses.set(
    member.id + commandName,
    (commandUses.get(member.id + commandName) || 0) + 1
  );
}

function removeLimit(
  member: GuildMember,
  command: BaseCommand,
  commandName: string,
  channel: GuildTextBasedChannel
) {
  let limits = getCommandLimitsFor(member, command);
  if (!limits) return;

  if (areLimitsIgnored(limits, channel)) return false;

  let limitEnd = commandLimitEnd.get(member.id + commandName);
  if (limitEnd) {
    if (limitEnd < Date.now()) {
      commandLimitEnd.set(
        member.id + commandName,
        Date.now() + limits.interval
      );
      commandUses.set(member.id + commandName, 0);
    }
  } else {
    commandLimitEnd.set(member.id + commandName, Date.now() + limits.interval);
  }

  commandUses.set(
    member.id + commandName,
    Math.max(0, (commandUses.get(member.id + commandName) || 0) - 1)
  );
}

function secondsToEnglish(seconds: number) {
  if (seconds >= 60 * 60 * 24) {
    let days = Math.ceil(seconds / (60 * 60 * 24));
    return days + (days === 1 ? " day" : " days");
  }
  if (seconds >= 60 * 60) {
    let hours = Math.ceil(seconds / (60 * 60));
    return hours + (hours === 1 ? " hour" : " hours");
  }
  if (seconds >= 60) {
    let minutes = Math.ceil(seconds / 60);
    return minutes + (minutes === 1 ? " minute" : " minutes");
  }
  return seconds + (seconds === 1 ? " second" : " seconds");
}

export function registerClientAsCommandHandler(
  client: Client,
  commandFolder: string,
  clientID: string,
  token: string
) {
  const commands: Collection<string, BotCommand> = new Collection();
  const mentionCommands: Collection<string, MentionCommand> = new Collection();

  const commandFiles = fs
    .readdirSync(commandFolder)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  const mentionCommandFiles = fs
    .readdirSync(commandFolder + "/mentions")
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  const JSONcommands = [];
  let broadcastCommand = {
    name: "shout",
    description: "Broadcast a command!",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [],
  };

  for (const file of commandFiles) {
    const command = require(`${commandFolder}/${file}`);
    // check if data and execute are defined in command
    if (command.data && command.execute) {
      const commandJSON = command.JSON ?? command.data.toJSON();

      commands.set(command.data.name, command);
      JSONcommands.push(commandJSON);

      if (command.broadcastable) {
        broadcastCommand.options.push(commandToBroadcastOption(commandJSON));
      }
    }
  }

  for (const file of mentionCommandFiles) {
    const command = require(`${commandFolder}/mentions/${file}`);
    // check if matches and execute are defined in command
    if (command.matches && command.execute) {
      mentionCommands.set(command.NAME_DUMB, command);
    }
  }

  if (broadcastCommand.options.length > 0) JSONcommands.push(broadcastCommand);

  const rest = new REST({ version: "10" }).setToken(token);
  (async () => {
    try {
      const EMPTY = [];
      const applicationCommands =
        process.env.NODE_ENV === "development" ? EMPTY : JSONcommands;
      const applicationGuildCommands =
        process.env.NODE_ENV === "development" ? JSONcommands : EMPTY;
      await rest.put(
        Routes.applicationGuildCommands(clientID, process.env.GUILD_ID),
        { body: applicationGuildCommands }
      );
      await rest.put(Routes.applicationCommands(clientID), {
        body: applicationCommands,
      });
    } catch (error) {
      console.error(error);
    }
  })();

  client.on(Events.MessageCreate, async (message) => {
    if (!message.member) return;
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    // check if it mentions the bot
    if (!message.mentions.has(client.user.id)) return;

    let member = message.member as GuildMember;
    let channel = message.channel as GuildTextBasedChannel;

    // replace the mention with nothing and trim the message, removing double spaces too
    let text = escapeDiscordMarkdown(
      message.content
        .replace("<@" + client.user.id + ">", "")
        .replace(/ +/g, " ")
        .trim()
    );

    for (const [, command] of mentionCommands) {
      if (command.matches(text)) {
        if (isCommandLimited(member, command, command.NAME_DUMB, channel))
          return;
        if (isOnCooldown(member.id, command.NAME_DUMB)) return;
        if (isOnCooldown(member.id)) return;

        setOnCooldown(message.member.id, command.NAME_DUMB, command.cooldown);
        addLimits(message.member, command, command.NAME_DUMB, message.channel);

        try {
          await command.execute(message, text);
        } catch (error) {
          console.error(error);
        }
        return;
      }
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // This is a GuildMember because it's a slash command
    let member = interaction.member as GuildMember;

    let commandName = interaction.commandName;
    let preferBroadcast = isBroadcastChannel(interaction.channel);
    if (commandName === "shout") {
      commandName = interaction.options.getSubcommand();
      preferBroadcast = true;
    }

    const command = commands.get(commandName);
    if (!command) return;

    const followLimits = interaction.guildId === process.env.GUILD_ID;

    if (followLimits) {
      if (isCommandLimited(member, command, commandName, interaction.channel)) {
        const finishedTimestamp = Math.ceil(
          (Date.now() + getLimitTime(member, commandName)) / 1000
        );
        let limitTime = getLimitTime(member, commandName);
        let subCommand = interaction.options.getSubcommand(false);
        let commandFormat =
          interaction.commandName + (subCommand ? " " + subCommand : "");

        replyToInteraction(
          interaction,
          "Limit",
          "\n• You've used this command too much! You can use it again <t:" +
            finishedTimestamp +
            ":R>.",
          false
        );

        if (limitTime < 20 * 1000) {
          setTimeout(() => {
            editInteractionReply(
              interaction,
              "Limit",
              "\n• You can now use </" +
                commandFormat +
                ":" +
                interaction.commandId +
                ">.",
              false
            );
          }, limitTime + Math.random() * 750);
        }
        return;
      }
    }

    if (isOnCooldown(interaction.user.id, commandName)) {
      // TODO Could personalize this message depending on the bot's personality
      const finishedTimestamp = Math.ceil(
        commandCooldown.get(interaction.user.id + commandName) / 1000
      );
      let cooldownTime = getCooldown(interaction.user.id, commandName);
      let subCommand = interaction.options.getSubcommand(false);
      let commandFormat =
        interaction.commandName + (subCommand ? " " + subCommand : "");

      replyToInteraction(
        interaction,
        "Cooldown",
        "\n• Hold on! You can use this command again <t:" +
          finishedTimestamp +
          ":R>.",
        false
      );

      if (cooldownTime < 20 * 1000) {
        setTimeout(() => {
          editInteractionReply(
            interaction,
            "Cooldown",
            "\n• You can now use </" +
              commandFormat +
              ":" +
              interaction.commandId +
              ">.",
            false
          );
        }, cooldownTime);
      }
      return;
    } else if (isOnCooldown(interaction.user.id)) {
      if (COOLDOWN_TIME > 2750) {
        const finishedTimestamp = Math.ceil(
          commandCooldown.get(interaction.user.id) / 1000
        );
        let cooldownTime = getCooldown(interaction.user.id);

        replyToInteraction(
          interaction,
          "Cooldown",
          "\n• Hold on! You can use another command <t:" +
            finishedTimestamp +
            ":R>.",
          false
        );

        if (cooldownTime < 20 * 1000) {
          setTimeout(() => {
            editInteractionReply(
              interaction,
              "Cooldown",
              "\n• You can now use commands again.",
              false
            );
          }, cooldownTime);
        }
      } else {
        replyToInteraction(
          interaction,
          "Cooldown",
          "\n• Hold on! You're sending commands too quickly!",
          false
        );
      }
      return;
    }

    setOnCooldown(interaction.user.id, commandName, command.cooldown);
    if (followLimits) {
      addLimits(member, command, commandName, interaction.channel);
    }

    try {
      const doRemoveCooldown = await command.execute(
        interaction,
        preferBroadcast
      );
      if (doRemoveCooldown) {
        setOnCooldown(interaction.user.id, commandName, 5 * 1000); // keep it on cooldown for at least 5 more sec.
        removeLimit(member, command, commandName, interaction.channel);
      }
    } catch (error) {
      console.error(error);
      try {
        await replyToInteraction(
          interaction,
          "Error",
          "\n• Sorry, an error occurred while running that command.",
          preferBroadcast
        );
      } catch (error) {
        // we're really in deep now
        console.error(error);
      }
    }
  });

  client.login(token);
}

function isBroadcastChannel(channel: GuildTextBasedChannel) {
  if (!channel) return false;
  return channel.name.toLowerCase().includes("bot");
}

/**
 * Gets the content string that should be displayed as a response when executing a command. The content includes a header, the response, and may mention the user who executed the interaction, depending on if this particular interaction is being broadcasted.
 *
 * @param interaction The command interaction object.
 * @param header The header text.
 * @param response The response text.
 * @param broadcast Whether or not this interaction is being broadcasted.
 * @returns The content to be displayed as a response.
 */
export function getInteractionContent(
  interaction: CommandInteraction,
  header: string,
  response: string,
  broadcast: boolean
) {
  return (
    "**" +
    header +
    " ⋆˚࿔ ——**" +
    (broadcast ? "\n\n<@" + interaction.user.id + ">" : "") +
    "\n" +
    response
  );
}

/**
 * Replies to an interaction with the given header and response.
 * This function is a shorthand which calls getInteractionContent to get the content string that should be displayed as a response, and replies to the interaction.
 *
 * **NOTE:** This function will not work if the interaction was already replied to, if the interaction was deferred (use {@link editInteractionReply} instead), or if the time to reply to the interaction has passed.
 *
 * @param interaction The command interaction object.
 * @param header The header text.
 * @param response The response text.
 * @param broadcast Whether or not this interaction is being broadcasted.
 */
export async function replyToInteraction(
  interaction: CommandInteraction,
  header: string,
  response: string,
  broadcast: boolean,
  options?: Partial<InteractionReplyOptions>
) {
  if (interaction.replied) {
    return;
  }

  await interaction.reply({
    content: getInteractionContent(interaction, header, response, broadcast),
    ephemeral: !broadcast,
    ...options,
  });
}

/**
 * Edits an interaction that was already replied to with the given header and response.
 * This function is a shorthand which calls getInteractionContent to get the content string that should be displayed as a response, and edits the interaction.
 *
 * **NOTE:** This function will not work if the interaction was not previously replied to, if the interaction was replied to with an ephemeral message, if the interaction was replied to with a message that wasn't sent by this bot, or if the message was deleted.
 *
 * @param interaction The command interaction object.
 * @param header The header text.
 * @param response The response text.
 * @param broadcast Whether or not this interaction is being broadcasted.
 */
export async function editInteractionReply(
  interaction: CommandInteraction,
  header: string,
  response: string,
  broadcast: boolean,
  options?: Partial<InteractionReplyOptions>
) {
  if (!interaction.deferred && !interaction.replied) {
    return;
  }

  const { flags, ...rest } = options ?? {};

  await interaction.editReply({
    content: getInteractionContent(interaction, header, response, broadcast),
    ...rest,
  });
}
