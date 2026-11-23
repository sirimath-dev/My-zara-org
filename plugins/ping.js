export default async ({ sock, jid, msg }) => {
  const start = Date.now();
  const sent = await sock.sendMessage(jid, { text: '🏓 Pinging…' }, { quoted: msg });
  await sock.sendMessage(jid, { text: `🏓 Pong!\nLatency: ${Date.now() - start} ms` }, { quoted: sent });
};
