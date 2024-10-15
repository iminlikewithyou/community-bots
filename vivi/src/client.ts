import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { registerClientAsCommandHandler } from '../../src/command-handler';
import { getWordsInDictionary } from '../../src/dictionary/dictionary';
import { formatNumberShorthand } from '../../src/utils';
import path from 'node:path';

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

viviClient.once('ready', () => {
  require('./app-emoji/finish-upload');
});

//

registerClientAsCommandHandler(viviClient, path.join(__dirname, '../commands'), process.env.VIVI_CLIENT_ID, process.env.VIVI_TOKEN);

//
