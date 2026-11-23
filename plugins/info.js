export default async ({ sock, jid, config }) => {
  await sock.sendMessage(jid, { text: `👑 ${config.botName}\nPlatform: WhatsApp Multi-Device\nLibrary: Baileys\nDatabase: MongoDB Atlas\nOwner: ${config.ownerNumber}` });
};
