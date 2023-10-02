import { ActionRowBuilder, CommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("testcreaterule")
  .setDescription("test command, don't look!");

export async function execute(interaction: CommandInteraction, preferBroadcast: boolean) {
  let highestRule = 13;
  
  const modal = new ModalBuilder()
    .setCustomId("createRule")
    .setTitle("Create a Regular Rule");

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
    .setMinLength(4)
    .setMaxLength(300)
    .setRequired(true);
  
  const noteTextInput = new TextInputBuilder()
    .setCustomId("ruleNote")
    .setLabel("Note")
    .setPlaceholder("Anything else to say to the people?")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(300)
    .setRequired(false);
  
  const actionRow1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(ruleToAddInput);
  const actionRow2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(ruleTextInput);
  const actionRow3 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(noteTextInput);

  // Add components to modal
  modal.addComponents(actionRow1, actionRow2, actionRow3);

  // Show the modal to the user
  await interaction.showModal(modal);
}