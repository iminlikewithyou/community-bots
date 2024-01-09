import { Message } from "discord.js";
import * as roll from "../roll";

export const NAME_DUMB = "roll";

export const cooldown = roll.cooldown;
export const type = roll.type;

export const limits = roll.limits;

export const index = 20;

export function matches(text: string) {
  return /%/i.test(text);
}

export async function execute(message: Message, text: string) {
  let max = 100 + 1; // (0 - 100)

  let response = await message.reply({
    content: "https://omg.games/assets/rolling.gif"
  });

  setTimeout(async () => {
    // edit the reply with @user rolls X/max
    await response.edit({
      content: "" + Math.floor(Math.random() * max) + "%"
    });
  }, 1200);
}