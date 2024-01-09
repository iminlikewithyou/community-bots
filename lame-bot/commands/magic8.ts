import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("magic8")
  .setDescription("Shake the magic 8 ball!");

export const cooldown = 8 * 1000;
export const type = ["fun", "annoying"];

export const limits = [];
limits[0] = {
  max: 2,
  interval: 10 * 60 * 1000,
  includeBotsChannel: false
};
limits[1] = {
  max: 4,
  interval: 5 * 60 * 1000,
  includeBotsChannel: false
};
limits[2] = {
  max: 20,
  interval: 20 * 60 * 1000,
  includeBotsChannel: false
};

const responses = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes - definitely.",
  "You may rely on it.",

  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",

  // "Reply hazy, try again.",
  // "Ask again later.",
  // "Better not tell you now.",
  // "Cannot predict now.",
  // "Concentrate and ask again.",

  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",

  "No.",
];

const terribleResponses = [
  "Whatever <@971202946895339550> thinks.",
  "Shut up.",
  "heheheeh >:3 You'll never get the answer i wont tell you :3c >w<.",
  "<:e:948803642327203860>."
]

export function getResponse() {
  if (Math.random() < 0.0175) {
    return "_" + terribleResponses[Math.floor(Math.random() * terribleResponses.length)] + ".._";
  }
  return "_" + responses[Math.floor(Math.random() * responses.length)] + ".._";
}

export async function execute(interaction: ChatInputCommandInteraction, preferBroadcast: boolean) {
  let max = interaction.options.get("max")?.value as number ?? 10;

  await interaction.reply({
    content: "https://omg.games/assets/rolling.gif"
  });

  setTimeout(async () => {
    // edit the reply with @user rolls X/max
    await interaction.editReply({
      content: "<@" + interaction.user.id + "> **•** " + getResponse()
    });
  }, 1200);
}