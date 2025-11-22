# IKAS Bildirimlerim

Multi-tenant SaaS platformu - IKAS mağazaları için Telegram sipariş bildirimleri.

## Özellikler

- 🏢 Çoklu ajans ve mağaza yönetimi
- 📱 Telegram bot entegrasyonu
- 🔔 Gerçek zamanlı sipariş bildirimleri
- 👥 Rol tabanlı yetkilendirme (Super Admin / Agency Admin)
- 📊 Dashboard ve raporlama
- 🔐 Güvenli oturum yönetimi

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm start
```

## Ortam Değişkenleri

```env
TELEGRAM_BOT_TOKEN=your_bot_token
DATABASE_URL=your_postgresql_url (opsiyonel, yoksa SQLite kullanır)
PORT=3000
NODE_ENV=production
```

## Teknolojiler

- Node.js + Express
- PostgreSQL / SQLite
- Telegram Bot API
- IKAS GraphQL API

## Lisans

Proprietary
