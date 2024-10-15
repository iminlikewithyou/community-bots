import { getAllEmojiNames } from "../../../src/emoji/emoji-directory";
import { viviClient } from "../client";

viviClient.application.emojis.cache.forEach(emoji => {
  console.log(`"${emoji.name}": "${emoji.id}",`);
});

getAllEmojiNames().forEach((emojiName) => {
  const foundEmoji = viviClient.emojis.cache.find(e => e.name === emojiName);
  if (!foundEmoji) {
    console.log(`Missing emoji: ${emojiName}`);
  }
});