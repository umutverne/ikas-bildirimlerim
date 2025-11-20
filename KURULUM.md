# IKAS Bildirimlerim - Kurulum Kılavuzu

## Hızlı Başlangıç

### 1. Telegram Bot Oluştur

**Telegram'ı aç:**
- `@BotFather` ara
- `/newbot` komutunu gönder
- Bot ismini belirle
- Bot kullanıcı adını belirle
- Token'ı kaydet

**Chat ID'ni bul:**
- Botuna bir mesaj gönder
- Şu URL'yi ziyaret et: `https://api.telegram.org/bot<TOKEN>/getUpdates`
- `"chat":{"id":123456789}` kısmındaki ID'yi kaydet

### 2. Projeyi Kur

```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarla

`.env` dosyasını düzenle:

```env
PORT=3000
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 4. Servisi Başlat

**Geliştirme Modu:**
```bash
npm run dev
```

**Production Modu:**
```bash
npm start
```

### 5. Test Et

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Örnek Sipariş Gönder:**
```bash
curl -X POST http://localhost:3000/webhook/order \
  -H "Content-Type: application/json" \
  -d '{"order_number":"100045","total":199.9,"currency":"TRY","customer":{"name":"Test"},"items":[{"name":"Ürün A","qty":1}]}'
```

## IKAS Entegrasyonu

IKAS panelinde webhook URL'nizi ayarlayın:

```
http://your-server-ip:3000/webhook/order
```

## Sorun Giderme

**Telegram mesajı gelmiyor:**
- `.env` dosyasında `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` doğru mu kontrol et
- Server loglarını kontrol et
- Bota önce mesaj gönderdiğinden emin ol

**Port hatası:**
- `.env` dosyasında farklı bir port belirle
- 3000 portunun kullanımda olup olmadığını kontrol et

**Webhook çalışmıyor:**
- Server çalışıyor mu kontrol et: `curl http://localhost:3000/health`
- JSON formatının doğru olduğundan emin ol
- Server loglarını incele

## Destek

Sorunlar için README.md dosyasına bakın veya logları kontrol edin.
