import { ActivityType, Client, GatewayIntentBits } from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerClientAsCommandHandler } from '../../src/command-handler';
import { getWordsInDictionary } from '../../src/dictionary/dictionary';
import { formatNumberShorthand } from '../../src/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const viviClient = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ],
  allowedMentions: { parse: ['users'] }
});

function updatePresence() {
  viviClient.user.setPresence({
    activities: [{
      name: formatNumberShorthand(getWordsInDictionary()) + ' words',
      type: ActivityType.Watching
    }],
    status: 'online'
  });
  setTimeout(updatePresence, 86400000);
}

viviClient.on('ready', () => {
  console.log(`Logged in as ${viviClient.user.tag}!`);
  updatePresence();
});

//

registerClientAsCommandHandler(
  viviClient,
  path.join(__dirname, '../commands'),
  process.env.VIVI_CLIENT_ID,
  process.env.VIVI_TOKEN
);

//
