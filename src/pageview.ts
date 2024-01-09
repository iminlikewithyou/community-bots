import { CommandInteraction, ButtonComponent, ActionRowBuilder, ButtonBuilder, ButtonStyle, BaseGuildTextChannel, ButtonInteraction, Message, InteractionCollector } from 'discord.js';
import { getInteractionContent } from "./command-handler";

// shitty default buttons, also debating whether to force customid to be set as first, previous, etc
// or just leave them and assume you put them in the correct order, i think this is more clear and
// easier to figure out at a glance than forcing them to be in order
const DefaultButtons = {
  first: new ButtonBuilder().setCustomId('first').setLabel('First').setStyle(ButtonStyle.Primary),
  previous: new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary),
  search: new ButtonBuilder().setCustomId('search').setLabel('Random').setStyle(ButtonStyle.Primary),
  next: new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary),
  last: new ButtonBuilder().setCustomId('last').setLabel('Last').setStyle(ButtonStyle.Primary),
}

// Ok so this is gonna be as Basic as possible,
/// the button order HAS TO BE, first, previous, search, next, last
export const PagedResponse = async (
  interaction: CommandInteraction, 
  pages: string[], 
  buttons: ButtonBuilder[] = Object.values(DefaultButtons),
  timeout: number = 15000, // milliseconds? timeout after 15 seconds
  preferBroadcast: boolean = false
) => {
  let page_index = 0;
  let page_length = pages.length;
  let startedPageAt = Date.now();

  // sorting the buttons is extremely annoying because i cant view the customid of the buttons
  // before they are sent, which means i cant force the order of the buttons without
  // sacrificing some sort of customizability (you could use the button labels, but that would mean no custom labels)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  // this can fail if we are using messages (non-slash commands) instead of interactions
  // noting this down just incase
  await interaction.deferReply({ephemeral: !preferBroadcast}).catch(() => {});
  let initialmessage = await interaction.editReply({
    content: pages[page_index],
    components: [row],
  })

  const collector = initialmessage.createMessageComponentCollector({
    // i cant tell if this is the correct way to filter out other users inputs
    // but its probably fine? i guess? maybe?
    filter: (i) => i.user.id === interaction.user.id,
    time: timeout
  });

  collector.on('collect', async(i: ButtonInteraction) => {
    
    switch(i.customId) {
      case 'first':
        page_index = 0;
        break;
      case 'previous':
        if (page_index !== 0) page_index--;
        break;
      case 'search':
        // search for a page
        // maybe later, seems complicated
        
        // for now it will just be a random page :3
        page_index = Math.floor(Math.random() * page_length)
        break;
      case 'next':
        if (page_index !== page_length - 1) page_index++;
        break;
      case 'last':
        page_index = page_length - 1;
        break;
      default:
        break;
    }
    
    // reset the timeout timer if the user is still using buttons,
    // unless its been 2 minutes since the interaction started,
    // then we just let it run out, max 135 seconds
    if (Date.now() - startedPageAt < 120000) {
      collector.resetTimer();
    }

    await i.update({
      content: pages[page_index],
      components: [row],
    }).catch((err) => {
      // this is the error code for the message being too long to post
      if (err.code === 50035) {
        // i.update({
        //   content: "This page is too long to display, please use the buttons to navigate.",
        //   components: [],
        // }).catch(() => {}); // if this errors just give up tbh

        collector.stop();
      }
    })
  });

  collector.on('end', () => {
    // this just removes the buttons after the timeout period,
    // disabling and graying out all of the buttons looks ugly
    // and takes up too much space
    interaction.editReply({
      components: []
    }).catch(() => {}) // BUG: this will error if the interaction has been deleted (or didnt send), shouldnt be a big issue but whatever
  })
};