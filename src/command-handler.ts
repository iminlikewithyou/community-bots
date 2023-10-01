import { Client, Collection, CommandInteraction, Events, GuildMember, GuildTextBasedChannel, Routes } from "discord.js";
import { REST } from "@discordjs/rest";
import fs from "node:fs";

const COOLDOWN_TIME = 2000;
const commandCooldown = new Map();

const commandUses = new Map();
const commandLimitEnd = new Map();

type CommandLimit = {
  max: number | false;
  interval: number;
  includeBotsChannel: boolean;
}

type BotCommand = {
  data: any;
  cooldown: number;
  limits?: CommandLimit[];
  tags?: string[];
  execute: (interaction: any, preferBroadcast: boolean) => Promise<void>;
}

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

function getCommandLimitsFor(member: GuildMember, command: BotCommand): CommandLimit {
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
  if (limit.includeBotsChannel) return false;
  return channel.name.toLowerCase().includes("roll") || isBroadcastChannel(channel);
}

function isCommandLimited(member: GuildMember, command: BotCommand, commandName: string, channel: GuildTextBasedChannel) {
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

function addLimits(member: GuildMember, command: BotCommand, commandName: string, channel: GuildTextBasedChannel) {
  let limits = getCommandLimitsFor(member, command);
  if (!limits) return;

  if (areLimitsIgnored(limits, channel)) return false;

  let limitEnd = commandLimitEnd.get(member.id + commandName);
  if (limitEnd) {
    if (limitEnd < Date.now()) {
      commandLimitEnd.set(member.id + commandName, Date.now() + limits.interval);
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

export function registerClientAsCommandHandler(client: Client, commandFolder: string, clientID: string, token: string) {
  const commands: Collection<string, BotCommand> = new Collection();
  const commandFiles = fs
    .readdirSync(commandFolder)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  const JSONcommands = [];
  let broadcastCommand = {
    name: "shout",
    description: "Broadcast a command!",
    options: [],
  };

  for (const file of commandFiles) {
    const command = require(`${commandFolder}/${file}`);
    // check if data and execute are defined in command
    if (command.data && command.execute) {
      const commandJSON = command.data.toJSON();

      commands.set(command.data.name, command);
      JSONcommands.push(commandJSON);

      if (command.broadcastable) {
        broadcastCommand.options.push(commandToBroadcastOption(commandJSON));
      }
    }
  }

  if (broadcastCommand.options.length > 0) JSONcommands.push(broadcastCommand);

  const rest = new REST({ version: "10" }).setToken(token);
  (async () => {
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientID, process.env.GUILD_ID),
        { body: JSONcommands }
      );
    } catch (error) {
      console.error(error);
    }
  })();

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

    if (isCommandLimited(member, command, commandName, interaction.channel)) {
      const timeLeft = Math.ceil(getLimitTime(member, commandName) / 1000 + 1);
      replyToInteraction(
        interaction,
        "Limit",
        "\n- You've used this command too much! You can use it again in " + secondsToEnglish(timeLeft) + ".",
        false
      );
      return;
    }

    if (isOnCooldown(interaction.user.id, commandName)) {
      // TODO Could personalize this message depending on the bot's personality
      const timeLeft = Math.ceil(getCooldown(interaction.user.id, commandName) / 1000 + 1);
      replyToInteraction(
        interaction,
        "Cooldown",
        "\n- Hold on! You can use this command again in " + timeLeft + (timeLeft === 1 ? " second." : " seconds."),
        false
      );
      return;
    } else if (isOnCooldown(interaction.user.id)) {
      if (COOLDOWN_TIME > 2750) {
        const timeLeft = Math.ceil(getCooldown(interaction.user.id) / 1000 + 1);
        replyToInteraction(
          interaction,
          "Cooldown",
          "\n- Hold on! You can use another command in " + timeLeft + (timeLeft === 1 ? " second." : " seconds."),
          false
        );
      } else {
        replyToInteraction(
          interaction,
          "Cooldown",
          "\n- Hold on! You're sending commands too quickly!",
          false
        );
      }
      return;
    }

    
    setOnCooldown(interaction.user.id, commandName, command.cooldown);
    addLimits(member, command, commandName, interaction.channel);

    try {
      await command.execute(interaction, preferBroadcast);
    } catch (error) {
      console.error(error);
      await replyToInteraction(
        interaction,
        "Error",
        "\n- Sorry, an error occurred while running that command.",
        preferBroadcast
      );
    }
  });

  client.login(token);
}

function isBroadcastChannel(channel: GuildTextBasedChannel) {
  return channel.name == "lame-bots";
}

export async function replyToInteraction(interaction: CommandInteraction, header: string, response: string, broadcast: boolean) {
  await interaction.reply({
    content:
      "**" + header + " *｡✲ﾟ ——**" +
      (broadcast ? "\n\n<@" + interaction.user.id + ">" : "") +
      "\n" + response,
    ephemeral: !broadcast,
  });
}