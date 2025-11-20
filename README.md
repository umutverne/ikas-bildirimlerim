# 🚀 IKAS Bildirimlerim

Multi-channel order notification service for IKAS e-commerce stores. Receives order webhooks and sends real-time notifications through various channels.

## 📋 Overview

**IKAS Bildirimlerim** is a production-ready Node.js backend service that processes IKAS order webhooks and delivers instant notifications to store owners and staff.

**Current Status:**
- ✅ **Phase 1: Telegram** (Implemented)
- 📧 **Phase 2: Email** (Planned)
- 📱 **Phase 3: WhatsApp** (Planned)

## 🏗️ Architecture

```
ikas-bildirimlerim/
├── package.json
├── .env.example
├── README.md
└── src/
    ├── server.js              # Express server with health check & webhook
    ├── formatOrderMessage.js  # Order data formatter (defensive)
    ├── telegram.js            # Telegram Bot API integration
    ├── email.js               # Email module (Phase 2 placeholder)
    └── whatsapp.js            # WhatsApp module (Phase 3 placeholder)
```

## ✨ Features

### Current (Phase 1)

- **Health Check Endpoint** (`GET /health`)
- **Order Webhook** (`POST /webhook/order`)
- **Telegram Notifications** with formatted order details
- **Defensive Data Parsing** - handles missing or variable field names
- **Graceful Degradation** - server starts even without Telegram config
- **Environment-Based Configuration**

### Planned

- **Email Notifications** (Phase 2)
- **WhatsApp Business API** (Phase 3)
- **Multi-channel routing** based on store preferences

## 🔧 Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Server Configuration
PORT=3000

# Telegram Configuration (Phase 1)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Email Configuration (Phase 2 - Not yet implemented)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password_here

# WhatsApp Configuration (Phase 3 - Not yet implemented)
WHATSAPP_TOKEN=your_whatsapp_business_api_token
WHATSAPP_PHONE_ID=your_whatsapp_phone_id
```

### Getting Telegram Credentials

1. **Create a bot:**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` and follow the instructions
   - Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Get your chat ID:**
   - Start a chat with your bot
   - Send any message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find `"chat":{"id":123456789}` in the response
   - Use that number as `TELEGRAM_CHAT_ID`

## 🚀 Installation & Running

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

Uses `nodemon` for automatic restart on file changes.

### Run in Production Mode

```bash
npm start
```

## 📡 API Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK"
}
```

**Usage:**
```bash
curl http://localhost:3000/health
```

---

### 2. Order Webhook

**Endpoint:** `POST /webhook/order`

**Request Body (Example):**
```json
{
  "order_id": "TEST-123",
  "order_number": "100045",
  "total": 199.9,
  "currency": "TRY",
  "customer": {
    "name": "Ahmet Yılmaz",
    "phone": "+905551234567"
  },
  "items": [
    { "name": "Ürün A", "qty": 1 },
    { "name": "Ürün B", "qty": 2 }
  ],
  "created_at": "2025-01-01T10:23:00Z"
}
```

**Success Response:**
```json
{
  "ok": true
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "TELEGRAM_NOT_CONFIGURED"
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3000/webhook/order \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": "100045",
    "total": 199.9,
    "currency": "TRY",
    "customer": {
      "name": "Test Customer",
      "phone": "+905551234567"
    },
    "items": [
      {"name": "Product A", "qty": 1},
      {"name": "Product B", "qty": 2}
    ],
    "created_at": "2025-01-01T10:23:00Z"
  }'
```

## 📨 Telegram Message Format

When an order is received, the following message is sent to Telegram:

```
🛒 Yeni Sipariş!
#100045

👤 Müşteri: Ahmet Yılmaz
📱 Telefon: +905551234567
💰 Toplam: 199.9 TRY

📦 Ürünler:
- 1x Ürün A
- 2x Ürün B

📅 Tarih: 2025-01-01 13:23
```

## 🛡️ Error Handling

The service includes comprehensive error handling:

- **Missing Telegram Config:** Returns `TELEGRAM_NOT_CONFIGURED` but server continues running
- **Invalid Order Data:** Defensive formatter replaces missing fields with "Bilinmiyor"
- **Telegram API Errors:** Logged with full details, returns 500 with error message
- **Unknown Routes:** Returns 404 with helpful message

## 🔍 Defensive Data Parsing

The `formatOrderMessage.js` module handles various field name conventions:

| Expected Field | Alternative Names Accepted |
|----------------|----------------------------|
| `order_number` | `orderNumber`, `number`, `id`, `order_id` |
| `total` | `total_price`, `totalPrice`, `grand_total` |
| `currency` | `currency_code` |
| `items` | `line_items`, `products` |
| `customer.name` | `customer.fullName`, `customer.full_name`, `customerName` |
| `created_at` | `createdAt`, `date`, `order_date` |

Missing fields display as **"Bilinmiyor"** (Unknown).

## 🧪 Testing

### Manual Testing

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test health check:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Test webhook with sample data:**
   ```bash
   curl -X POST http://localhost:3000/webhook/order \
     -H "Content-Type: application/json" \
     -d @test-order.json
   ```

### Sample Test Data

Create `test-order.json`:
```json
{
  "order_number": "TEST-001",
  "total": 299.99,
  "currency": "TRY",
  "customer": {
    "name": "Test Müşteri",
    "phone": "+905551234567"
  },
  "items": [
    { "name": "Test Ürün 1", "qty": 2 },
    { "name": "Test Ürün 2", "qty": 1 }
  ],
  "created_at": "2025-01-19T10:00:00Z"
}
```

## 🔮 Future Enhancements

### Phase 2: Email Notifications
- HTML email templates
- Support for multiple recipients
- Order attachments (PDF invoices)
- SMTP configuration via environment variables

### Phase 3: WhatsApp Notifications
- WhatsApp Business API integration
- Message templates (required by WhatsApp)
- Delivery status tracking
- Send to customer's phone number

### Additional Features
- Multi-channel routing (route notifications based on store/order type)
- Notification preferences per store
- Rate limiting and queuing
- Webhook signature verification
- Admin dashboard for monitoring
- Database logging for audit trail

## 🤝 Contributing

This is a production service for IKAS stores. For feature requests or bug reports, please contact the development team.

## 📄 License

ISC

## 🆘 Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify your `.env` configuration
3. Test Telegram bot credentials manually
4. Check firewall/network settings for API access

---

**Built with ❤️ for IKAS merchants**
