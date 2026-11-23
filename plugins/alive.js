export default async ({ sock, jid, settings, config }) => {
  await sock.sendMessage(jid, { text: `👑 ${settings.botName || config.botName} is online and ready.` });
};
