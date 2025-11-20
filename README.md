# IKAS Bildirimlerim

Multi-channel order notification service for IKAS e-commerce platform.

## Features

- Real-time order notifications via Telegram
- Multi-language support (Turkish/English)
- Multiple recipient support
- Order filtering by minimum amount
- Retry mechanism for failed deliveries
- Docker support

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
PORT=3000
LANGUAGE=tr
MIN_ORDER_AMOUNT=0

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Run

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Order Webhook
```
POST /webhook/order
```

Accepts order data and sends notifications to configured channels.

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `LANGUAGE` | Notification language (tr/en) | No (default: tr) |
| `MIN_ORDER_AMOUNT` | Minimum order amount to notify | No (default: 0) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Yes |
| `TELEGRAM_CHAT_ID` | Chat IDs (comma-separated) | Yes |

## Docker

```bash
docker-compose up -d
```

## Telegram Setup

1. Create bot with @BotFather
2. Get bot token
3. Message your bot
4. Get chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`

## License

MIT
