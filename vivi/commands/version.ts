async function versionCommand(interaction, broadcastThis) {
  // TODO: Finish the file
  // @ts-ignore
  await replyToInteraction(interaction, "Version", "\n• v" + version, broadcastThis);
}
