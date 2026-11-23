export default async ({ sock, jid, config }) => {
  const seconds = Math.floor(process.uptime());
  const time = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`;
  await sock.sendMessage(jid, { text: `⏱ ${config.botName} runtime: ${time}` });
};
