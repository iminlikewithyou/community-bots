import { MongoClient } from "mongodb";

// Connection URL
const url = process.env.MONGO_URL;
const client = new MongoClient(url, {
  sslValidate: false
});

// let db;

// Database Name
const dbName = "lame";

// Round collection document:
// gameID
// winner
// solvers (user + word) (includes winner)
// startedAt
// completedAt
// prompt
// promptWord
// solutionCount
// solution
// usedVivi
// exact
// timestamp

// Rankings collection document:
// User
// Leaderboard ID
// Score
// Wins
// Solves
// Late solves
// Exact solves
// Vivi uses
// Jinxes

export async function getSolutionCount(solution) {
  // get number of times solution appears in the rounds collection
  let gameID = await getDefaultGameID();
  let count = await client
    .db(dbName)
    .collection("rounds")
    .countDocuments({ gameID, solution });
  return count;
}

export async function getRegularRuleState() {
  /*
    stored in lame/regular_rules_state as a single document
    
    regular rules state document properties:
    
    lastLottery: timestamp (last time the lottery was run)
    lastWinner: discord user id (last winner of the lottery)
    ruleAdded: boolean (whether a new rule was added since the last lottery)
    highestRuleNumber: number (highest rule number - new rules will be added with this number + 1)
    lottery: array of objects (each object has a discord user id and the amount of entries they have)
  */

  let regularRulesState = await client
    .db(dbName)
    .collection("regular_rules_state")
    .find({})
    .limit(1)
    .toArray();
  
  if (regularRulesState.length === 0) {
    await client
      .db(dbName)
      .collection("regular_rules_state")
      .insertOne({
        lastLottery: 0,
        lastWinner: null,
        ruleAdded: false,
        highestRuleNumber: 0,
        lottery: []
      });
    
    regularRulesState = await client
      .db(dbName)
      .collection("regular_rules_state")
      .find({})
      .limit(1)
      .toArray();
  }

  return regularRulesState[0];
}

export async function doRegularRuleLottery() {
  let regularRulesState = await getRegularRuleState();

  let lottery = regularRulesState.lottery;
  let totalEntries = lottery.reduce((total, entry) => total + entry.entries, 0);
  let roll = Math.floor(Math.random() * totalEntries);
  let currentRoll = 0;

  let winner = null;
  for (let i = 0; i < lottery.length; i++) {
    currentRoll += lottery[i].entries;
    if (currentRoll > roll) {
      winner = lottery[i].user;
    }
  }

  // remove the winner from the lottery and give everyone else 1 more entry to give them a greater chance of winning next time
  lottery = lottery.filter(entry => entry.user !== winner);
  lottery = lottery.map(entry => {
    entry.entries++;
    return entry;
  });

  await client
    .db(dbName)
    .collection("regular_rules_state")
    .updateOne({}, {
      $set: {
        lastLottery: Date.now(),
        lastWinner: winner,
        ruleAdded: false,
        lottery
      }
    });

  return winner;
}

type RuleLotteryEntry = {
  user: string,
  entries: number,
  joinedAt: number,
  totalEntries?: number
};

export async function joinRegularRuleLottery(user): Promise<RuleLotteryEntry> {
  let regularRulesState = await getRegularRuleState();

  let lottery = regularRulesState.lottery;

  let userEntry = lottery.find(entry => entry.user === user);
  if (userEntry) {
    // add totalEntries property to userEntry
    userEntry.totalEntries = lottery.reduce((total, entry) => total + entry.entries, 0);
    return userEntry;
  }

  lottery.push({
    user,
    entries: 1,
    joinedAt: Date.now()
  });

  await client
    .db(dbName)
    .collection("regular_rules_state")
    .updateOne({}, {
      $set: {
        lottery
      }
    });

  return null;
}

type RegularRule = {
  author: string,
  ruleNumber: number,
  ruleText: string,
  subrules?: RegularRule[],
  timestamp: number
}

export async function getRegularRule(ruleNumber) {
  let rule = await client
    .db(dbName)
    .collection("regular_rules")
    .find({ ruleNumber })
    .limit(1)
    .toArray();
  if (rule.length === 0) return null;
  return rule[0];
}

export async function getRegularRuleTotalCharacterLength(ruleNumber) {
  let rule = await getRegularRule(ruleNumber);
  if (!rule) return 0;
  let ruleTextLength = ("- " + ruleNumber + ".").length;
  let totalLength = rule.ruleText.length + ruleTextLength;
  if (rule.subrules) {
    for (let i = 0; i < rule.subrules.length; i++) {
      // totalLength += await getRegularRuleTotalCharacterLength(rule.subrules[i].ruleNumber);
      totalLength += rule.subrules[i].ruleText.length + 2 + 2; // space before the dash and the extra letter, and the new line
    }
  }
  return totalLength;
}



export async function getProfile(user) {
  let profile = await client
    .db(dbName)
    .collection("profiles")
    .find({ user })
    .limit(1)
    .toArray();
  if (profile.length === 0) {
    await client
      .db(dbName)
      .collection("profiles")
      .insertOne({ user, cash: 100, points: 0 });
    profile = await client
      .db(dbName)
      .collection("profiles")
      .find({ user })
      .limit(1)
      .toArray();
  }
  return profile[0];
}

export async function getCash(user) {
  let profile = await getProfile(user);
  return profile.cash || 0;
}

export async function spendCash(user, amount) {
  if (amount < 0) return false;
  let profile = await getProfile(user);
  if (profile.cash < amount) return false;
  await client
    .db(dbName)
    .collection("profiles")
    .updateOne({ user }, { $set: { cash: profile.cash - amount } });
}

export async function getUserSolveCount(user) {
  let allTimeLeaderboardID = await getAllTimeLeaderboardID();
  let userStats = await client
    .db(dbName)
    .collection("rankings")
    .find({ user, leaderboardID: allTimeLeaderboardID })
    .limit(1)
    .toArray();
  if (userStats.length === 0) return 0;
  return userStats[0].solves;
}

export async function getUserExactSolves(user) {
  let allTimeLeaderboardID = await getAllTimeLeaderboardID();
  let userStats = await client
    .db(dbName)
    .collection("rankings")
    .find({ user, leaderboardID: allTimeLeaderboardID })
    .limit(1)
    .toArray();
  if (userStats.length === 0) return 0;
  return userStats[0].exactSolves;
}

// get amount of times a user has solved a prompt
export async function getUserSolveCountForPrompt(user, prompt, promptLength) {
  let gameID = await getDefaultGameID();
  let count = await client.db(dbName).collection("rounds").countDocuments({
    gameID,
    winner: user,
    prompt: prompt.source,
    promptLength,
  });
  // this is really slow because there are so many rounds
  return count;
}

// get a user's first solution to a specific prompt by completion timestamp
export async function getFirstSolutionToPrompt(user, prompt, promptLength) {
  let gameID = await getDefaultGameID();
  let solutionRound = await client
    .db(dbName)
    .collection("rounds")
    .find({ gameID, winner: user, prompt: prompt.source, promptLength })
    .sort({ completedAt: 1 })
    .limit(1)
    .toArray();
  if (solutionRound.length === 0) return null;
  return solutionRound[0].solution;
}

// update database after a round is completed
export async function finishRound(solves, startedAt, prompt, promptWord, promptLength, solutionCount) {
  const gameID = await getDefaultGameID();
  const allTimeLeaderboardID = await getAllTimeLeaderboardID();

  const winner = solves[0].user;

  const round = {
    gameID,
    winner,
    solvers: solves,
    startedAt,
    completedAt: Date.now(),
    prompt: prompt.source,
    promptWord,
    promptLength,
    solutionCount,
    solution: solves[0].solution,
    usedVivi: solves[0].usedVivi,
    exact: promptWord === solves[0].solution
  };

  const operations = solves.map((solve) => {
    const { user, solution, usedVivi } = solve;

    const isJinx = solves.some(
      (s) => s.solution === solution && s.user !== user
    );
    const isWinner = user === winner;
    const isExact = promptWord === solution;

    return {
      updateOne: {
        filter: { user: solve.user, leaderboardID: allTimeLeaderboardID },
        update: {
          $inc: {
            wins: isWinner ? 1 : 0,
            solves: isWinner ? 1 : 0,
            score: isWinner ? 1 : 0,
            exactSolves: isExact && isWinner ? 1 : 0,
            lateSolves: !isWinner ? 1 : 0,
            viviUses: usedVivi ? 1 : 0,
            jinxes: isJinx ? 1 : 0
          }
        },
        upsert: true
      }
    };
  });

  console.log(operations);

  const promises = [
    client.db(dbName).collection("rounds").insertOne(round),
    client.db(dbName).collection("rankings").bulkWrite(operations),
  ];

  await Promise.all(promises);
}

let defaultGameID;
export async function getDefaultGameID() {
  if (defaultGameID) return defaultGameID;
  defaultGameID = (
    await client.db(dbName).collection("games").find({}).limit(1).toArray()
  )[0]._id;
  return defaultGameID;
}

let defaultGameChannel;
export async function getDefaultGameChannel() {
  if (defaultGameChannel) return defaultGameChannel;
  defaultGameChannel = (
    await client.db(dbName).collection("games").find({}).limit(1).toArray()
  )[0].channel;
  return defaultGameChannel;
}

let defaultGameGuild;
export async function getDefaultGameGuild() {
  if (defaultGameGuild) return defaultGameGuild;
  defaultGameGuild = (
    await client.db(dbName).collection("games").find({}).limit(1).toArray()
  )[0].guild;
  return defaultGameGuild;
}

export async function getReplyMessage() {
  let replyMessage = (
    await client.db(dbName).collection("games").find({}).limit(1).toArray()
  )[0].replyMessage;
  return replyMessage;
}

export async function setReplyMessage(message) {
  await client
    .db(dbName)
    .collection("games")
    .updateOne({}, { $set: { replyMessage: message.id } });
}

let allTimeLeaderboardID;
export async function getAllTimeLeaderboardID() {
  if (allTimeLeaderboardID) return allTimeLeaderboardID;
  allTimeLeaderboardID = (
    await client
      .db(dbName)
      .collection("leaderboards")
      .find({})
      .limit(1)
      .toArray()
  )[0]._id;
  return allTimeLeaderboardID;
}

// TODO this can be expensive to call twice
// get user ranking in the default leaderboard by score using rank aggregation
export async function getUserRanking(user) {
  let leaderboardID = await getAllTimeLeaderboardID();
  let ranking = await client
    .db(dbName)
    .collection("rankings")
    .aggregate([
      { $match: { leaderboardID } },
      {
        $setWindowFields: {
          sortBy: { score: -1 },
          output: { rank: { $rank: {} } }
        }
      },
      { $match: { user } }
    ])
    .toArray();
  if (ranking.length === 0) return null;
  return ranking[0].rank;
}

export async function getCurrentRoundInfo() {
  let gameID = await getDefaultGameID();

  let lastWinnerArray = await client
    .db(dbName)
    .collection("rounds")
    .find({ gameID })
    .sort({ completedAt: -1 })
    .limit(1)
    .toArray();
  if (lastWinnerArray.length == 0) return { lastWinner: undefined, streak: 0 };

  let lastWinner = lastWinnerArray[0].winner;

  let lastRoundWinnerHasntWon = await client
    .db(dbName)
    .collection("rounds")
    .find({ gameID, winner: { $ne: lastWinner } })
    .sort({ completedAt: -1 })
    .limit(1)
    .toArray();
  let streak;
  if (lastRoundWinnerHasntWon.length == 0) {
    streak = await client
      .db(dbName)
      .collection("rounds")
      .countDocuments({ gameID });
  } else {
    let lastTimeWinnerHasntWon = lastRoundWinnerHasntWon[0].completedAt;
    console.log("Winner has last lost at " + lastTimeWinnerHasntWon);
    streak = await client
      .db(dbName)
      .collection("rounds")
      .countDocuments({
        gameID,
        winner: lastWinner,
        completedAt: { $gte: lastTimeWinnerHasntWon }
      });
  }

  return { lastWinner, streak };
}
