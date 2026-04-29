# CloudVault

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/Storage-Discord-5865F2?logo=discord&logoColor=white" alt="Discord" />
  <img src="https://img.shields.io/badge/Storage-Telegram-26A5E4?logo=telegram&logoColor=white" alt="Telegram" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT" />
</p>

<p align="center">
  Cloud storage gratis — file kamu disimpan di Discord & Telegram channel.<br/>
  Tanpa database. Tinggal deploy ke Vercel.
</p>

---

## Gimana cara kerjanya?

File yang kamu upload disimpan langsung ke **Discord channel** atau **Telegram chat** sebagai attachment. Metadata (nama file, ukuran, lokasi chunk) disimpan sebagai embed di Discord — jadi kalau server restart, tinggal scan ulang channel-nya.

| Ukuran File | Disimpan di | Cara |
|---|---|---|
| ≤ 50 MB | Telegram | Upload langsung 1 file |
| > 50 MB | Discord | Browser split jadi chunk 4MB, upload satu-satu |

Tidak pakai database sama sekali. Vercel-friendly.

## Fitur

- **Upload & Download** — drag & drop, support file besar (auto-split)
- **File Preview** — gambar, video, audio bisa preview langsung
- **File Manager** — search, filter by storage, delete
- **Telegram Bot** — kirim file ke bot → otomatis tersimpan
- **Bot Commands** — `/list`, `/get`, `/search`, `/stats`
- **Responsive** — mobile & desktop
- **Dark theme**

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/username/cloudvault.git
cd cloudvault
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DISCORD_BOT_TOKEN=xxx
DISCORD_CHANNEL_ID=xxx
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
```

<details>
<summary><b>Cara dapetin token Discord</b></summary>

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. New Application → Bot → Copy token
3. Invite bot ke server (permission: Send Messages, Attach Files, Read Message History, Embed Links)
4. Enable Developer Mode → klik kanan channel → Copy Channel ID

</details>

<details>
<summary><b>Cara dapetin token Telegram</b></summary>

1. Chat [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy token
3. Buat group/channel, tambahkan bot sebagai admin
4. Kirim pesan, lalu buka `https://api.telegram.org/bot<TOKEN>/getUpdates` untuk dapat Chat ID

</details>

### 3. Run

```bash
npm run dev
```

Buka [localhost:3000](http://localhost:3000)

## Deploy ke Vercel

1. Push repo ke GitHub
2. Buka [vercel.com/new](https://vercel.com/new) → import repo
3. Tambah environment variables (`DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
4. Deploy
5. Setup Telegram webhook:
   ```
   https://your-app.vercel.app/api/webhook/telegram?url=https://your-app.vercel.app
   ```

## Struktur Project

```
├── app/
│   ├── api/
│   │   ├── files/            GET list, DELETE file
│   │   ├── upload/           POST chunk upload
│   │   ├── upload/complete/  POST finalize multi-chunk
│   │   ├── download/[id]/    GET download/preview
│   │   └── webhook/telegram/ POST webhook, GET setup
│   ├── page.js               Main UI
│   ├── layout.js
│   └── globals.css
├── lib/
│   ├── discord.js            Discord API + embed metadata
│   ├── telegram.js           Telegram Bot API
│   ├── telegram-handler.js   Shared bot command handler
│   ├── telegram-polling.js   Polling mode (local dev)
│   ├── storage.js            In-memory file index
│   └── client-api.js         Client-side chunked upload
├── vercel.json
└── .env.example
```

## Limitasi

- **Vercel free tier**: function timeout 10 detik (upgrade ke Pro untuk 60 detik)
- **Telegram Bot API**: download max 20MB per file via API
- **Discord**: rate limit ~5 request/detik
- **Cold start**: pertama kali buka setelah idle, perlu scan Discord channel (bisa lambat kalau banyak file)

## Tech Stack

- [Next.js 14](https://nextjs.org/) — App Router + API Routes
- [Discord API](https://discord.com/developers/docs) — file storage + metadata
- [Telegram Bot API](https://core.telegram.org/bots/api) — file storage + bot
- [Vercel](https://vercel.com/) — hosting

## License

MIT
