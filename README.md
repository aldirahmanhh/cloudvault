<div align="center">

# ☁️ CloudVault

**Free unlimited cloud storage powered by Discord & Telegram**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
[![Discord](https://img.shields.io/badge/Storage-Discord-5865F2?logo=discord&logoColor=white)](https://discord.com/)
[![Telegram](https://img.shields.io/badge/Storage-Telegram-26A5E4?logo=telegram&logoColor=white)](https://telegram.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Live Demo](https://cloudvault.my.id) • [Documentation](docs/) • [Report Bug](issues) • [Request Feature](issues)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Deployment](#-deployment)
- [Security](#-security)
- [API Documentation](#-api-documentation)
- [Architecture](#-architecture)
- [Limitations](#-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

CloudVault is a **serverless cloud storage solution** that leverages Discord and Telegram as backend storage providers. Upload files up to **2GB** with zero database dependency, automatic chunking, and built-in file management.

### Why CloudVault?

- ✅ **Zero Cost** — No database, no storage fees
- ✅ **Unlimited Storage** — Limited only by Discord/Telegram quotas
- ✅ **Serverless** — Deploy to Vercel in 2 minutes
- ✅ **No Vendor Lock-in** — Your data stays in your Discord/Telegram channels
- ✅ **Privacy First** — Self-hosted, you control everything
- ✅ **Production Ready** — Rate limiting, auth, SEO optimized

---

## ✨ Features

### Core Features
- 📤 **Drag & Drop Upload** — Support files up to 2GB with automatic chunking
- 📥 **Fast Downloads** — Direct streaming from Discord/Telegram CDN
- 🖼️ **Media Preview** — Built-in preview for images, videos, and audio
- 🔍 **Smart Search** — Find files instantly with full-text search
- 🗂️ **File Management** — Organize, filter, and delete files easily
- 📱 **PWA Support** — Install as native app on mobile/desktop

### Telegram Bot
- 🤖 **File Upload via Bot** — Send files directly to Telegram bot
- 💬 **Bot Commands** — `/list`, `/get`, `/search`, `/stats`, `/help`
- 🔔 **Real-time Sync** — Files uploaded via bot appear instantly in web UI

### Security & Performance
- 🔐 **Authentication** — Secure user registration and login
- 🛡️ **Rate Limiting** — Protection against brute force and spam
- 🚀 **Edge Optimized** — Deployed on Vercel Edge Network
- 📊 **SEO Optimized** — Open Graph, Twitter Cards, structured data

---

## 🔧 How It Works

CloudVault uses Discord channels and Telegram chats as storage backends:

| File Size | Storage Provider | Method |
|-----------|------------------|--------|
| ≤ 50 MB   | Telegram         | Single file upload |
| > 50 MB   | Discord          | Chunked upload (4MB chunks) |

**Metadata Storage**: File metadata (name, size, chunks) is stored as Discord embeds, enabling stateless operation without a database.

**Architecture Benefits**:
- No database costs or maintenance
- Automatic CDN distribution via Discord/Telegram
- Survives server restarts (metadata persists in Discord)
- Scales horizontally on Vercel Edge

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Discord bot token ([Get it here](https://discord.com/developers/applications))
- Telegram bot token ([Get it here](https://t.me/BotFather))

### Installation

```bash
# Clone repository
git clone https://github.com/aldirahmanhh/cloudvault.git
cd cloudvault

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configuration

Edit `.env.local`:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Optional: Custom domain
NEXT_PUBLIC_SITE_URL=https://cloudvault.my.id
```

<details>
<summary><b>📘 How to get Discord credentials</b></summary>

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → Create a bot
3. Copy the **Bot Token** from the Bot tab
4. Invite bot to your server with permissions:
   - Send Messages
   - Attach Files
   - Read Message History
   - Embed Links
5. Enable **Developer Mode** in Discord settings
6. Right-click your channel → **Copy Channel ID**

</details>

<details>
<summary><b>📘 How to get Telegram credentials</b></summary>

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the **Bot Token**
4. Create a private channel or group
5. Add your bot as admin
6. Send a message, then visit:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
7. Copy the `chat.id` from the response

</details>

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aldirahmanhh/cloudvault)

**Manual Deployment:**

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CHANNEL_ID`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `NEXT_PUBLIC_SITE_URL` (optional)
5. Click **Deploy**

### Setup Telegram Webhook

After deployment, configure the webhook:

```bash
curl "https://cloudvault.my.id/api/webhook/telegram?url=https://cloudvault.my.id"
```

Or visit the URL in your browser.

---

## 🔒 Security

CloudVault implements multiple security layers:

### Authentication
- ✅ Secure password hashing with bcrypt
- ✅ JWT-based session management
- ✅ HTTP-only cookies for token storage

### Rate Limiting
- ✅ **Registration**: 3 attempts per IP per 15 minutes
- ✅ **Login**: 10 attempts per IP per minute
- ✅ **Failed Login Protection**: Exponential backoff (30s → 1 hour)
- ✅ **Account Lockout**: After 3 failed attempts

### Additional Protections
- ✅ HTTPS enforced in production
- ✅ CORS configured for API routes
- ✅ Input validation and sanitization
- ✅ XSS protection via Next.js

**Read more**: [Rate Limiting Guide](RATE-LIMIT-GUIDE.md) • [SEO Guide](SEO-GUIDE.md)

---

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "password": "securepass"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "securepass"
}
```

### File Operations

#### Upload File
```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

#### List Files
```http
GET /api/files?page=1&limit=20&search=query
Authorization: Bearer <token>
```

#### Download File
```http
GET /api/download/:fileId
Authorization: Bearer <token>
```

#### Delete File
```http
DELETE /api/files/:fileId
Authorization: Bearer <token>
```

**Full API Reference**: [API.md](docs/API.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Upload UI  │  │  File List   │  │   Preview    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Next.js API   │
                    │   (Vercel Edge) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │  Discord API    │          │  Telegram API   │
     │  (Files > 50MB) │          │  (Files ≤ 50MB) │
     └─────────────────┘          └─────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, Lucide Icons |
| **Backend** | Next.js API Routes, Serverless Functions |
| **Storage** | Discord API, Telegram Bot API |
| **Auth** | JWT, bcrypt, HTTP-only cookies |
| **Deployment** | Vercel Edge Network |
| **Styling** | CSS Modules, Custom CSS |

### Project Structure

```
cloudvault/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── files/             # File CRUD operations
│   │   ├── upload/            # Upload handlers
│   │   ├── download/          # Download handlers
│   │   └── webhook/           # Telegram webhook
│   ├── components/            # React components
│   ├── page.js                # Main dashboard
│   ├── layout.js              # Root layout + metadata
│   └── globals.css            # Global styles
├── lib/
│   ├── auth.js                # Authentication logic
│   ├── discord.js             # Discord API client
│   ├── telegram.js            # Telegram API client
│   ├── storage.js             # In-memory file index
│   ├── rate-limit.js          # Rate limiting middleware
│   └── client-api.js          # Client-side utilities
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── logo.png               # App icon
├── docs/                      # Documentation
├── .env.example               # Environment template
├── vercel.json                # Vercel configuration
└── package.json
```

---

## ⚠️ Limitations

### Vercel Free Tier
- Function timeout: 10 seconds (upgrade to Pro for 60s)
- Bandwidth: 100GB/month
- Invocations: 100GB-hours/month

### Discord API
- Rate limit: ~5 requests/second
- File size: 25MB per message (chunked for larger files)
- Channel message limit: 10,000 messages (use multiple channels)

### Telegram Bot API
- File size: 50MB per file
- Download via API: 20MB max (use direct links for larger files)

### Cold Starts
- First request after idle: 2-5 seconds (Discord channel scan)
- Subsequent requests: <100ms

**Mitigation**: Use Vercel Pro for faster cold starts, or implement Redis caching.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Commit Convention**: We follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Discord](https://discord.com/) - Storage provider
- [Telegram](https://telegram.org/) - Storage provider & bot platform
- [Vercel](https://vercel.com/) - Hosting platform
- [Lucide Icons](https://lucide.dev/) - Icon library

---

## 📞 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/aldirahmanhh/cloudvault/issues)
- 💡 **Feature Requests**: [Open an issue](https://github.com/aldirahmanhh/cloudvault/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/aldirahmanhh/cloudvault/discussions)
- 📧 **Email**: support@cloudvault.my.id

---

<div align="center">

**Made with ❤️ by [aldirahmanhh](https://github.com/aldirahmanhh)**

⭐ Star this repo if you find it useful!

[Website](https://cloudvault.my.id) • [GitHub](https://github.com/aldirahmanhh/cloudvault) • [Documentation](docs/)

</div>
