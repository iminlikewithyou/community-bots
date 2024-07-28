import { CommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import leaderboardEmojis from "../../assets/emoji-maps/leaderboardEmojis";
import { getDefaultGameGuild, getLeaderboard } from "../../src/database/db";
import { formatNumber, getCleanName } from "../../src/utils";
import { getGuild } from "../src/client";
import { getRemarkEmoji } from "../../src/emoji-renderer";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View the Word Bomb Mini leaderboard!")
  .addIntegerOption((option) =>
    option
      .setName("page")
      // no page should be treated as the users page but whats a good way to convey that?
      .setDescription(
        "The page of the leaderboard to view (defaults to your page)"
      )
      // leaderboard is ever changing so we cant know a exact value
      // should default to last page if index is out of bounds
      .setMaxValue(9999)
      .setMinValue(1)
      .setRequired(false)
  );

export const cooldown = 5 * 1000;
export const broadcastable = true;

async function getDisplayName(userID: string) {
  return (await getGuild(await getDefaultGameGuild())).members
    .fetch(userID)
    .then((member: GuildMember) => {
      return getCleanName(member.displayName ?? member.user.displayName);
    })
    .catch(() => {
      return "Lame Guest";
    });
}

async function buildLeaderboardMessage(page: any[], startNum: number, cmdUserID: string) {
  let message = `### ${getRemarkEmoji("bomb")}  All-Time Score`;
  let names = await Promise.all(
    page.map(async (page) => {
      if (cmdUserID === page.user) {
        return `<@${cmdUserID}>`;
      } else {
        return await getDisplayName(page.user);
      }
    })
  );

  for (let i = 0; i < page.length; i++) {
    let user = page[i];
    let name = names[i];
    let placement = startNum + i;

    if (startNum == 1 && placement <= 10) {
      message += `\n${leaderboardEmojis[placement]}  ${name} • **${formatNumber(user.score)} ${user.score == 1 ? "point" : "points"}**`;
    } else {
      message += `\n${placement}. ${name} • **${formatNumber(user.score)} ${user.score == 1 ? "point" : "points"}**`;
    }
  }

  return message;
}

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let page = interaction.options.get("page");
  let message;
  let leaderboard = await getLeaderboard(null);

  if (!page) {
    let user = interaction.user.id;
    // im hoping this isnt Mega Slow but honestly its probably fine
    let userIndex = leaderboard.findIndex((page) => page.user === user);

    // Rust would make this So Much Cooler
    if (userIndex === -1) {
      message = await buildLeaderboardMessage(
        leaderboard.slice(0, 10),
        1,
        interaction.user.id
      );
    } else {
      let startnum = userIndex - 5;
      if (userIndex + 1 >= leaderboard.length - 10) {
        startnum = leaderboard.length - 10;
      }

      // Old code for showing the full Page the user is on
      // pagenum = Math.floor(userIndex / 10) + 1;
      // message = await buildLeaderboardMessage(leaderboard.slice((pagenum - 1) * 10, pagenum * 10), (pagenum - 1) * 10)

      // show the placement of the user, but keep them in the middle of the page
      // (its 10 so it cant be exactly in the middle, overscores said this works fine)
      message = await buildLeaderboardMessage(
        leaderboard.slice(startnum, startnum + 10),
        startnum + 1,
        interaction.user.id
      );
    }
  } else {
    let pagenum: number = page.value as number;
    let totalNumOfPages = Math.ceil(leaderboard.length / 10);
    let startnum: number;

    if (pagenum >= totalNumOfPages) {
      let itemsOnLastPage = leaderboard.length % 10;
      let itemsNeeded = 10 - itemsOnLastPage;
      startnum = Math.max(
        leaderboard.length - itemsOnLastPage - itemsNeeded,
        0
      );
    } else {
      startnum = (pagenum - 1) * 10;
    }

    let endnum = Math.min(startnum + 10, leaderboard.length);
    message = await buildLeaderboardMessage(
      leaderboard.slice(startnum, endnum),
      startnum + 1,
      interaction.user.id
    );
  }

  await interaction.reply({
    content: message,
    ephemeral: !preferBroadcast
  });
}
