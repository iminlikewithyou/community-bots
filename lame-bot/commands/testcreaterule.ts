import { ActionRowBuilder, CommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("testcreaterule")
  .setDescription("test command, don't look!");

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let highestRule = 13;
  
  const modal = new ModalBuilder()
    .setCustomId("createRule")
    .setTitle("Create Rule");

  // Add components

  const ruleToAddInput = new TextInputBuilder()
    .setCustomId("ruleToAdd")
    .setLabel("Rule number to add")
    .setPlaceholder("13 to " + highestRule.toString() + " (or add subrules like 13b!)")
    .setValue(highestRule.toString())
    .setStyle(TextInputStyle.Short)
    .setMaxLength(5)
    .setRequired(true);

  const ruleTextInput = new TextInputBuilder()
    .setCustomId("ruleText")
    .setLabel("Rule text")
    .setPlaceholder("What's the rule?")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(6)
    .setMaxLength(300)
    .setRequired(true);
  
  const actionRow1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(ruleToAddInput);
  const actionRow2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(ruleTextInput);

  // Add components to modal
  modal.addComponents(actionRow1, actionRow2);

  // Show the modal to the user
  await interaction.showModal(modal);
}