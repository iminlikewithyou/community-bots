import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { formatNumber } from "../../src/utils";

export const data = new SlashCommandBuilder()
  .setName("timestamp")
  .setDescription("Generate a timestamp!")
  .addStringOption(option =>
    option
      .setName("date")
      .setDescription('The date in any format - or type "help" for help')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('The type of timestamp to generate')
      .setRequired(true)
      .addChoices(
        {
          name: 'relative • in 5 minutes',
          value: 'R'
        },
        {
          name: 'short time • 12:00 AM',
          value: 't',
        },
        {
          name: 'long time • 12:00:00 AM',
          value: 'T'
        },
        {
          name: 'short date • 8/8/2000',
          value: 'd'
        },
        {
          name: 'long date • August 8, 2000',
          value: 'D'
        },
        {
          name: 'long date with short time • August 8, 2000 at 12:00 AM',
          value: 'f'
        },
        {
          name: 'long date with day of the week and short time • Monday, August 8, 2000 at 12:00 AM',
          value: 'F'
        },
        {
          name: 'UNIX milliseconds • 1123456789000',
          value: 'ms'
        },
        {
          name: 'UNIX seconds • 1123456789',
          value: 'sec'
        }
      )
  );

// export const cooldown = 8 * 1000;

type TimestampDetails = {
  day?: number,
  month?: number,
  year?: number,

  hour?: number,
  minute?: number,
  second?: number,
  period?: "AM" | "PM"
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  // let max = interaction.options.get("max")?.value as number ?? 10;

  let constructedTimestamp: TimestampDetails = {}

  
}