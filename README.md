# QUEEN ZARA MD

WhatsApp Multi-Device pairing service built with Node.js, Express, Baileys and MongoDB Atlas. No Firebase is used.

## Important operational notes

- This project is a community-built integration using Baileys, not an official WhatsApp API product. WhatsApp may change its protocol and account linking can fail or be restricted.
- Pairing requires a real WhatsApp account and a phone number in international digits-only format (example: `947XXXXXXXX`).
- The server supports one active WhatsApp account at a time. Pairing is intentionally rate-limited.
- Keep `ADMIN_API_KEY`, MongoDB credentials and the database private. Never publish `.env` or Mongo session documents.
- Use the bot only with the account owner's permission. No unsolicited bulk messaging or surveillance features are included.
- Auto-react is represented in settings but intentionally not implemented as automatic reactions; avoid automated engagement behavior.

## Requirements

Node.js 20+, npm, MongoDB Atlas database.

## MongoDB Atlas

1. Create a free/paid MongoDB Atlas cluster.
2. Create a database user with a strong password.
3. In Network Access, allow the deployment host's outbound IP where practical. For Railway's changing egress IPs, Atlas may require `0.0.0.0/0`; use a dedicated database user with least privilege and strong credentials if you choose that option.
4. Copy the Node.js driver connection string and replace username/password/database.
5. Set it as `MONGODB_URI`.

## Run locally / Termux

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
node -v
mkdir queen-zara && cd queen-zara
```

Download/extract this project into the folder, then:

```bash
cp .env.example .env
nano .env
npm install
npm start
```

Fill `MONGODB_URI`, `OWNER_NUMBER` and a long random `ADMIN_API_KEY`. Keep the owner number in international digits only. Open `http://127.0.0.1:8080` on the same device, or use your host's public URL.

For a Termux-hosted server, Android may stop background processes; use Railway for a persistent deployment.

## Railway deployment

1. Push the project to a private GitHub repository.
2. In Railway, create a project and deploy from that repository.
3. Add variables from `.env.example` in Railway Variables. Do not upload `.env`.
4. Ensure `MONGODB_URI` points to Atlas and Atlas permits the Railway connection.
5. Railway detects `npm start` from the package script. Set a public domain in Networking.
6. Visit the generated domain. Pair with your international phone number.
7. On WhatsApp: Settings → Linked devices → Link a device → Link with phone number, then enter the displayed code.

Railway's filesystem is not used for authentication; credentials and Signal keys are stored in MongoDB.

## API

### `GET /`
Serves the pairing page.

### `GET /code?number=947XXXXXXXX`
Creates a real Baileys pairing request. Success: `{"status":true,"code":"..."}`. Failure: `{"status":false,"error":"..."}`. The route validates the number and prevents simultaneous requests for the same number.

### `GET /health`
Basic server/database process health response.

### `GET /api/status`
Returns connection state only. No credentials are returned.

### `GET /api/stats`
Returns uptime, handled message count and distinct user count.

### `POST /api/settings`
Requires `x-admin-key: <ADMIN_API_KEY>`. JSON fields may include `botName`, `prefix`, `autoRead`, `autoReact`, `autoTyping`, `welcome`, `goodbye`, `antiLink`. The API does not return owner secrets.

## Commands

Default prefix is `.`:
- `.menu`
- `.ping`
- `.alive`
- `.info`

Commands are plugin files in `plugins/`. A plugin exports an async default function receiving `{sock,msg,jid,sender,args,isOwner,settings,config}`. Set `handler.ownerOnly = true` to make a plugin owner-only.

## Troubleshooting

- **Mongo connection fails:** verify the URI, password URL-encoding, Atlas database user and Network Access.
- **Invalid number:** include country calling code, digits only, 8–15 digits.
- **Pairing request already active:** wait for the current request to finish; only one account/socket can be active.
- **Pairing code request fails:** inspect Railway logs. Baileys is an unofficial protocol client; try updating the pinned Baileys version only after reviewing breaking changes.
- **401 / logged out:** the linked session is no longer authorized. Remove the old `whatsapp_sessions` document in Atlas only when you intentionally want a fresh pairing, then restart the service.
- **428 / 515 / transient close:** these can occur during WhatsApp's handshake/restart cycle. Check server logs and wait for the reconnect handler. Do not repeatedly request codes.
- **Bot doesn't reply:** confirm the session is connected, send `.menu`, check the prefix, and inspect Railway logs.
- **Railway restart:** Mongo-backed auth state should persist. Never delete the session document unless re-pairing is intended.

## Security

The session document contains sensitive WhatsApp authentication material. Restrict Atlas access, keep database backups private, rotate credentials if exposed, and never add an endpoint to read session documents.
