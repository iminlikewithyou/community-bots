import { Message } from "discord.js";
import * as magic8 from "../magic8";

export const NAME_DUMB = "magic8"

export const cooldown = magic8.cooldown;
export const type = magic8.type;

export const limits = magic8.limits;

export const index = 25;

const questions = [
  // /^wh?a?t /i,
  /^will? /i,
  /^wo?n'?t /i,
  /^isn?'?t? /i,
  /^(?:are?|r)n?'?t? /i,
  /^am /i,
  /^doe?sn?'?t? /i,
  /^don?'?t?/i,
  /^can /i,
  /^co?u?l?dn?'?t? /i,
  /^sho?u?ldn?'?t? /i,
  /^wo?u?l?dn?'?t? /i,
  /^ha(?:ve|s)n?'?t? /i,
  /^didn?'?t? /i,
  /^may /i,
  /^mig?htn?'?t? /i,
  /^mu?stn?'?t? /i,
  /^sha?ll?n?'?t? /i,
];

export function matches(text: string) {
  for (let i = 0; i < questions.length; i++) {
    if (questions[i].test(text)) return true;
  }
  return false;
}

export async function execute(message: Message, text: string) {
  let response = await message.reply({
    content: "https://omg.games/assets/rolling.gif"
  });

  setTimeout(async () => {
    await response.edit({
      content: magic8.getResponse()
    });
  }, 1200);
}