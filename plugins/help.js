export default async ({ sock, jid, settings, config }) => {
  const p = settings.prefix || config.prefix;
  await sock.sendMessage(jid, { text: `Help — ${settings.botName || config.botName}\\n\\n${p}menu\\n${p}ping\\n${p}alive\\n${p}info\\n${p}runtime` });
};
