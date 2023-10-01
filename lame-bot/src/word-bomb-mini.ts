import { getCurrentRoundInfo, getAllTimeLeaderboardID, getUserRanking, getSolutionCount, getUserSolveCount, getDefaultGameChannel, finishRound, getUserExactSolves,
  getUserSolveCountForPrompt, getFirstSolutionToPrompt, getDefaultGameGuild, getReplyMessage, setReplyMessage } from "../../src/database/db";
import { isWord, generatePrompt, solverCache, cleanWord, escapeRegExp, getPromptRepeatableText, is1Related, is1000Related, is10000Related, is100Related,
  isDoomRelated } from "../../src/dictionary/dictionary";
import { getRemarkEmoji, getPromptRegexDisplayText, getPromptRegexText, getPromptRegexInlineText, getStreakNumbers, getSolveLetters } from "../../src/emoji-renderer";
import { formatNumber, formatPlacement, escapeDiscordMarkdown, createEnglishList, formatPercentage } from "../../src/utils";
import { lameBotClient, getChannel, sendMessage, getGuild, sendMessageAsReply } from "./client";

let guild;
let wordBombMiniChannel;

let streak;
let lastWinner;

let startedAt;
let prompt;
let promptWord;
let solutions;
let lengthRequired;

const REMARK = {
  // top remarks
  jinx: 97,
  tooLate: 94,

  // separator
  topSeparator: 89,

  // rank remarks
  rankShift: 79,

  // solve remarks
  solveNumber: 59,
  exactSolve: 57,

  // prompt stat remarks
  uniqueSolve: 39,
  promptiversary: 38,
  sameSolvePromptiversary: 37,

  // round remarks
  solveStreak: 18,
  usedSolver: 17,
  promptOrigin: 16
};

let remarks;

let replyMessage;

let inProgress = false;

let appearances = 0;
let uniqueSolutions = 0;

let solves = [];

function isNumberVowelSound(x) {
  return x == 11 || x == 18 || x.toString().startsWith("8");
}

function getCurrentPromptName() {
  return (
    getPromptRegexText(prompt) +
    (lengthRequired ? " - " + promptWord.length : "")
  );
}

function getCurrentPromptNameForMessage() {
  return (
    getPromptRegexInlineText(prompt) +
    (lengthRequired ? " - " + promptWord.length : "")
  );
}

function addRemark({ index, remark = "" }) {
  if (remarks[index]) {
    remarks[index] += remark + "\n";
  } else {
    remarks[index] = remark + "\n";
  }
}

function getRemarkText() {
  let remarkText = "";
  for (let i = remarks.length; i >= 0; i--) {
    if (remarks[i]) {
      remarkText += remarks[i];
    }
  }
  return remarkText.replace(/\n{3,}/g, "\n\n");
}

async function startRound() {
  if (inProgress) return;
  inProgress = true;

  remarks = [];

  solves = [];
  solverCache.clear();
  startedAt = Date.now();

  // make prompt
  ({ prompt, promptWord, solutions, lengthRequired } = generatePrompt());

  // send prompt to the channel
  console.log(wordBombMiniChannel.id);
  console.log(prompt);
  console.log(promptWord);

  await sendMessageAsReply(
    replyMessage,
    (
      getRemarkEmoji("bomb") + " **Quick!** Type a word containing:" +
      "\n\n" + getPromptRegexDisplayText(prompt) + " ***｡✲ﾟ** (" + formatNumber(solutions) + (solutions === 1 ? " solution)" : " solutions)") +
      (lengthRequired ? "\n\n- Must be **" + promptWord.length + "** characters!" : "")
    )
  );

  // lameBotClient.user.setPresence({
  //   activities: [{
  //     name: getCurrentPromptName()
  //   }],
  //   status: 'online'
  // });
}

(async function main() {
  ({ streak, lastWinner } = await getCurrentRoundInfo());
  guild = await getGuild(await getDefaultGameGuild());
  wordBombMiniChannel = await getChannel(await getDefaultGameChannel());

  replyMessage = await getReplyMessage();
  if (!replyMessage) {
    console.log("Setting the reply message - hold on a bit.");
    replyMessage = await sendMessage(
      wordBombMiniChannel,
      "<:e:775931479124344883> **Heads up!** A new round is starting! ***｡✲ﾟ**"
    );
    await setReplyMessage(replyMessage);
    await new Promise((resolve) => setTimeout(resolve, 8888));
  } else {
    replyMessage = await wordBombMiniChannel.messages.fetch(replyMessage);
  }

  // start a new round
  console.log("Starting a new round..");
  await startRound();
})();

function getCleanName(name) {
  let cleanName = escapeDiscordMarkdown(name.replace(/﷽𒐫𒈙⸻꧅ဪ/g, ""));
  if (cleanName === "") {
    if (name.length === 0) {
      return "Lame Member";
    } else {
      return "\\" + name[0];
    }
  }
  return cleanName;
}

async function getDisplayName(userID) {
  return await guild.members
    .fetch(userID)
    .then((member) => {
      return getCleanName(member.displayName);
    })
    .catch(() => {
      return "Lame Guest";
    });
}

const NUMBER_WORDS = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "eighth",
  9: "ninth",
  10: "tenth",
};

const JINX_APPENDS = [
  "just jinxed each other!",
  "also jinxed each other!",
  "jinxed each other too!",
  "jinxed each other as well!",
  "jinxed each other!",
];

// TODO: terrible name
function formatPlacementWithEnglishWords(x) {
  return NUMBER_WORDS[x] || formatPlacement(x);
}

// TODO: terrible names?
function engNum(x, singular, plural) {
  return x === 1 ? singular : plural;
}
function engLen(x, singular, plural) {
  return engNum(x.length, singular, plural);
}

async function endRound() {
  if (!inProgress) return;

  // Stop the round
  inProgress = false;
  // lameBotClient.user.setPresence({ status: 'idle', activities: [] });

  // Create helpful variables
  let winnerUser = solves[0].user;
  let winnerSolution = solves[0].solution;
  let winnerUsedVivi = solves[0].usedVivi;

  let lateSolves = solves.slice(1);

  async function completeRoundData() {
    let start = Date.now();
    let rankingBefore = await getUserRanking(winnerUser);
    await finishRound(
      solves,
      startedAt,
      prompt,
      promptWord,
      lengthRequired ? promptWord.length : null,
      solutions
    );
    console.log("Part 1 took " + (Date.now() - start) + "ms");

    let _a = await promptiversaryRemarks();
    console.log("Part 2 took " + (Date.now() - start) + "ms");

    let _b = await uniqueSolutionRemarks();
    console.log("Part 3 took " + (Date.now() - start) + "ms");

    let solveCount = await getUserSolveCount(winnerUser);
    console.log("Part 4 took " + (Date.now() - start) + "ms");

    let exactSolves = await getUserExactSolves(winnerUser);
    console.log("Part 5 took " + (Date.now() - start) + "ms");

    let rankingAfter;
    if (rankingBefore) rankingAfter = await getUserRanking(winnerUser);
    console.log("Part 6 took " + (Date.now() - start) + "ms");

    // a bit of an odd place to put uniqueSolutionRemarks, but it seems like the most optimal...
    // let promises = [, , , getUserExactSolves(winnerUser)]
    // promises.push();
    // let [_a, _b, solveCount, exactSolves, rankingAfter] = await Promise.all(promises);

    return {
      rankingBefore,
      rankingAfter,
      solveCount,
      exactSolves,
    };
  }

  // top remarks

  const lateRemarks = async () => {
    if (lateSolves.length === 0) return;

    let solverNames = await Promise.all(
      solves.map(async (solve) => {
        return await getDisplayName(solve.user);
      })
    );
    const getName = (user) =>
      solverNames[solves.findIndex((s) => s.user === user)];

    let jinxList = [];
    let wordsUsed = [...new Set(solves.map((s) => s.solution))]; // Sets in JS only store unique values, so this will remove any duplicates
    let lateSolversWhoHaveNotJinxed = [...lateSolves];

    for (let word of wordsUsed) {
      // get each player who used that word
      let playersWhoUsedWord = solves
        .filter((s) => s.solution === word)
        .map((s) => s.user);

      if (playersWhoUsedWord.length > 1) {
        // jinx!
        lateSolversWhoHaveNotJinxed = lateSolversWhoHaveNotJinxed.filter(
          (s) => !playersWhoUsedWord.includes(s.user)
        );
        jinxList.push(playersWhoUsedWord);
      }
    }

    // add remarks for each jinx
    for (let i = 0; i < jinxList.length; i++) {
      let jinxers = jinxList[i];

      let jinxerNames = jinxers.map(getName);
      let jinxText = JINX_APPENDS[i] || JINX_APPENDS[JINX_APPENDS.length - 1];

      addRemark({
        index: REMARK.jinx,
        remark:
          getRemarkEmoji("jinx") +
          " **" +
          createEnglishList(jinxerNames) +
          "** " +
          jinxText,
      });
    }

    let lateNames = lateSolversWhoHaveNotJinxed.map((solve) =>
      getName(solve.user)
    );
    if (lateNames.length > 0) {
      addRemark({
        index: REMARK.tooLate,
        remark: `**${createEnglishList(lateNames)}** ${engLen(
          lateNames,
          "was",
          "were"
        )} too late..`,
      });
    }
  };

  // solve remarks

  const solveRemarks = (solveNumber, exactSolves) => {
    let isSolveExact = winnerSolution === promptWord;

    let solveNumberOnlyHas6 = solveNumber
      .toString()
      .split("")
      .every((digit) => digit === "6");
    let solveNumberEndsIn69 = solveNumber % 100 === 69;
    let solveNumberStartsWith6 = solveNumber.toString().startsWith("6");
    let solveNumberEndsWith9 = solveNumber.toString().endsWith("9");
    let solveNumberOnlyHas6and9 = solveNumber
      .toString()
      .split("")
      .every((digit) => digit === "6" || digit === "9");

    let solveRemark;
    let hasRemarkedExactness = false;

    if (solveNumber === 1) {
      // First solve
      solveRemark =
        getRemarkEmoji("solve1") + " Congratulations on your **first solve**!";
      if (is1Related(winnerSolution)) {
        solveRemark +=
          "\n" +
          getRemarkEmoji("solve1Related") +
          ` **Amazing!** Your first solve was "${winnerSolution.toLowerCase()}"!`;
      }
      if (isSolveExact) {
        solveRemark +=
          "\n" +
          getRemarkEmoji("solve1Exact") +
          " **What?!** It's your first exact solve too?!";
        hasRemarkedExactness = true;
      }
    } else if (solveNumber % 10000 === 0) {
      // 10,000-solve milestone
      solveRemark =
        getRemarkEmoji("solve10000") +
        ` This is your **${formatNumber(
          solveNumber
        )}th solve**!!! Unbelievable!`;
      if (solveNumber === 10000 && is10000Related(winnerSolution)) {
        solveRemark +=
          "\n" +
          getRemarkEmoji("solve10000Related") +
          ` **AMAZING!** Your 10,000th solve was "${winnerSolution.toLowerCase()}"!`;
      }
    } else if (solveNumber % 1000 === 0) {
      // 1,000-solve milestone
      solveRemark =
        getRemarkEmoji("solve1000") +
        ` This is your **${formatNumber(solveNumber)}th solve**!!! Awesome!`;
      if (solveNumber === 1000 && is1000Related(winnerSolution)) {
        solveRemark +=
          "\n" +
          getRemarkEmoji("solve1000Related") +
          ` **Amazing!** Your 1,000th solve was "${winnerSolution.toLowerCase()}"!`;
      }
    } else if (solveNumber % 100 === 0) {
      // 100-solve milestone
      solveRemark =
        getRemarkEmoji("solve100") +
        ` This is your **${formatNumber(solveNumber)}th solve**!`;
      if (solveNumber === 100 && is100Related(winnerSolution)) {
        solveRemark +=
          "\n" +
          getRemarkEmoji("solve100Related") +
          ` **Awesome!** Your 100th solve was "${winnerSolution.toLowerCase()}"!`;
      }
    } else if (
      solveNumberEndsIn69 ||
      (solveNumberStartsWith6 &&
        solveNumberEndsWith9 &&
        solveNumberOnlyHas6and9)
    ) {
      // 69 milestones
      solveRemark =
        getRemarkEmoji("solve69") +
        ` This is your **${formatNumber(solveNumber)}th solve**. Nice.`;
    } else if (solveNumberOnlyHas6 && solveNumber > 600) {
      // 666 milestones
      solveRemark =
        getRemarkEmoji("solve666") +
        ` **${formatNumber(solveNumber)}th solve..**`;
      if (isDoomRelated(winnerSolution)) {
        solveRemark +=
          "\n" +
          getRemarkEmoji("solve666Related") +
          ` **Of course,** you solved it with "${winnerSolution.toLowerCase()}"..`;
      }
    }

    // Create the remark
    if (solveRemark) {
      addRemark({
        index: REMARK.solveNumber,
        remark: solveRemark,
      });
    }

    // Create an exact solve remark
    if (isSolveExact && !hasRemarkedExactness) {
      addRemark({
        index: REMARK.exactSolve,
        remark:
          getRemarkEmoji("exactSolve") +
          ` **Lucky!** That's your **${formatPlacementWithEnglishWords(
            exactSolves
          )}** exact solve!`,
      });
    }
  };

  // rank remarks

  // say who the next player to beat is
  const rankRemarks = (rankingBefore, rankingAfter, solveNumber) => {
    if (!rankingBefore) return;
    if (solveNumber <= 1) return;
    if (rankingAfter >= rankingBefore) return;

    if (rankingAfter === 1) {
      addRemark({
        index: REMARK.rankShift,
        remark:
          getRemarkEmoji("firstPlace") +
          " **You have taken first place!** (All-Time)",
      });
    } else {
      addRemark({
        index: REMARK.rankShift,
        remark:
          getRemarkEmoji("rankingMovement") +
          ` You went up **${formatNumber(
            rankingBefore - rankingAfter
          )}** ${engNum(
            rankingBefore - rankingAfter,
            "place",
            "places"
          )}, you're now **${formatPlacement(rankingAfter)}**! (All-Time)`,
      });
    }
  };

  // prompt stat remarks

  // depends on the round to be published
  const uniqueSolutionRemarks = async () => {
    let solutionCount = await getSolutionCount(winnerSolution);

    if (solutionCount === 1) {
      uniqueSolutions++;
      // Uncomment this when there are enough unique solutions
      // addRemark({
      //   index: REMARK.uniqueSolve,
      //   remark: getRemarkEmoji("uniqueSolve") + " That's the **first time** this solve has ever been used!"
      // });
    }

    // Keep track of unique solutions in the console
    appearances++;
    console.log(appearances, formatPercentage(uniqueSolutions / appearances));
    if (appearances > 99) {
      appearances = 0;
      uniqueSolutions = 0;
    }
  };

  // depends on the round to be published
  const promptiversaryRemarks = async () => {
    let promptiversary = await getUserSolveCountForPrompt(
      winnerUser,
      prompt,
      lengthRequired ? promptWord.length : null
    );

    if (
      promptiversary === 5 ||
      promptiversary === 10 ||
      promptiversary % 25 === 0
    ) {
      // It's an important promptiversary for the winner!
      addRemark({
        index: REMARK.promptiversary,
        remark:
          getRemarkEmoji("promptiversary") +
          ` It's your **${formatPlacementWithEnglishWords(
            promptiversary
          )} promptiversary** with "${getCurrentPromptNameForMessage()}"!`,
      });

      if (promptiversary === 5) {
        // this variable is only required at the fifth promptiversary - which means we'll yield twice
        let firstSolutionToPrompt = await getFirstSolutionToPrompt(
          winnerUser,
          prompt,
          lengthRequired ? promptWord.length : null
        );

        if (firstSolutionToPrompt === winnerSolution) {
          // The winner has solved this prompt with this solution before
          addRemark({
            index: REMARK.sameSolvePromptiversary,
            remark:
              getRemarkEmoji("promptiversaryStale") +
              " You solved this prompt with the **same word** as your first time!",
          });
        }
      }
    }
  };

  // this function yields to get the display name of the last winner
  const roundRemarks = async () => {
    // Update solve streaks
    if (lastWinner === winnerUser) {
      // Winner is the same as last winner
      streak++;
      if (streak >= 3) {
        // Winner is on a solve streak
        let solveStreakEmoji;
        switch (winnerUser) {
          case "320593811531235328":
            solveStreakEmoji = "solveStreakChristine";
            break;
          case "711739947606081676":
            solveStreakEmoji = "solveStreakDubious";
            break;
          default:
            solveStreakEmoji = "solveStreak";
            break;
        }
        addRemark({
          index: REMARK.solveStreak,
          remark: `**${getRemarkEmoji(solveStreakEmoji)} You're on ${
            isNumberVowelSound(streak) ? "an" : "a"
          } ${getStreakNumbers(streak)} solve streak! ${getRemarkEmoji(
            solveStreakEmoji
          )}**`,
        });
      }
    } else {
      // Winner is different from last winner
      if (streak >= 3) {
        // A streak has been broken
        let lastWinnerName = await getDisplayName(lastWinner);
        addRemark({
          index: REMARK.solveStreak,
          remark:
            getRemarkEmoji("streakEnded") +
            ` **${
              lastWinnerName + (lastWinnerName.endsWith("s") ? "'" : "'s")
            }** solve streak of **${streak}** has been ended!`,
        });
      }
      streak = 1;
      lastWinner = winnerUser;
    }
  };

  const basicRemarks = () => {
    addRemark({ index: REMARK.topSeparator });

    if (winnerUsedVivi) {
      addRemark({
        index: REMARK.usedSolver,
        remark:
          getRemarkEmoji("usedVivi") +
          " This player **used the solver** during this round.",
      });
    }

    addRemark({
      index: REMARK.promptOrigin,
      remark: `This prompt was created from "${promptWord.toLowerCase()}"`,
    });
  };

  let startTime2 = Date.now();

  await Promise.all([
    completeRoundData().then(
      ({ rankingBefore, rankingAfter, solveCount, exactSolves }) => {
        rankRemarks(rankingBefore, rankingAfter, solveCount);
        solveRemarks(solveCount, exactSolves);
        console.log("Part 7 took " + (Date.now() - startTime2) + "ms");
      }
    ),
    lateRemarks(),
    roundRemarks(),
  ]);

  console.log("Remarks: " + (Date.now() - startTime2) + "ms");

  basicRemarks();

  // send the message
  await sendMessage(
    wordBombMiniChannel,
    `**${getRemarkEmoji(
      "solvedIt"
    )} <@${winnerUser}> solved it! ${getRemarkEmoji("solvedIt")}**\n\n` +
      getRemarkEmoji("roundEnded") +
      " **Round ended!**\n" +
      getSolveLetters(winnerSolution, prompt) +
      "\n" +
      getRemarkText()
  );

  setTimeout(startRound, 8000);
}

// listen for messages from discord
lameBotClient.on("messageCreate", (message) => {
  // ignore messages from the bot
  if (message.author.bot) return;

  // stop if the game is not in progress
  if (!inProgress) return;

  // ignore messages not in the default game channel
  if (message.channel.id !== wordBombMiniChannel.id) return;

  // stop if this user has already solved
  if (solves.some((s) => s.user === message.author.id)) return;

  // check if the guess is a solve and if it contains the prompt
  let guess = cleanWord(message.content);
  if (prompt.test(escapeRegExp(guess)) && isWord(guess)) {
    let repeatablePrompt = getPromptRepeatableText(prompt);
    if (
      repeatablePrompt &&
      (guess === repeatablePrompt || guess === repeatablePrompt + "S")
    ) {
      if (solves.length > 0) return;
      message
        .reply("<@" + message.author.id + ">, you cannot repeat the prompt!")
        .catch((error) => {
          console.log(error);
        });
      return;
    }

    if (lengthRequired) {
      if (guess.length < promptWord.length) {
        if (solves.length > 0) return;
        message
          .reply(
            "<@" +
              message.author.id +
              ">, the word must be **" +
              promptWord.length +
              "** characters!\nYours was **" +
              guess.length +
              "**, go higher " +
              getRemarkEmoji("higher")
          )
          .catch((error) => {
            console.log(error);
          });
        return;
      } else if (guess.length > promptWord.length) {
        if (solves.length > 0) return;
        message
          .reply(
            "<@" +
              message.author.id +
              ">, the word must be **" +
              promptWord.length +
              "** characters!\nYours was **" +
              guess.length +
              "**, go lower " +
              getRemarkEmoji("lower")
          )
          .catch((error) => {
            console.log(error);
          });
        return;
      }
    }

    // add the solve to the list of solves
    solves.push({
      user: message.author.id,
      solution: guess,
      usedVivi: solverCache.has(message.author.id),
    });

    // if this player is the first to solve, start a timer to end the round after 300 milliseconds
    if (solves.length === 1) {
      setTimeout(endRound, 350);
    }
  }
});
