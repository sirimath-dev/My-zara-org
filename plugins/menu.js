export default async ({ sock, jid, settings, config }) => {
  const p = settings.prefix || config.prefix;
  await sock.sendMessage(jid, { text:
`╭─「 👑 ${settings.botName || config.botName} 」
│
├ ${p}menu  — Show commands
├ ${p}ping  — Check response
├ ${p}alive — Bot status
├ ${p}info  — Bot information
│
╰─「 QUEEN ZARA MD 」` });
};
