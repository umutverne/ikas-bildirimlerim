# IKAS Webhook Kurulum Rehberi

## 📋 Ön Gereksinimler

1. ✅ IKAS mağaza hesabı
2. ✅ IKAS Admin API erişimi
3. ✅ API Token (IKAS panelden alınacak)
4. ✅ Servisin deploy edilmiş URL'i

---

## 🔑 Adım 1: IKAS API Token Al

### IKAS Panele Git:
1. IKAS Admin Panel → **Ayarlar**
2. **Uygulamalar** veya **API Ayarları**
3. **Yeni API Token Oluştur**
4. Gerekli izinleri seç:
   - ✅ `order/view`
   - ✅ `order/edit`
5. Token'ı kopyala ve sakla

---

## 🚀 Adım 2: Servisi Deploy Et

Servisini bir cloud platformuna deploy et:

### Seçenek A: Railway (Önerilen)
```bash
# Railway hesabı aç: railway.app
# GitHub'a push et
git init
git add .
git commit -m "IKAS Bildirimlerim"
git push

# Railway'de deploy et
# URL'ini al: https://your-app.railway.app
```

### Seçenek B: Render.com
1. render.com → New Web Service
2. GitHub repo bağla
3. Build Command: `npm install`
4. Start Command: `npm start`

### Seçenek C: Heroku
```bash
heroku create ikas-bildirimlerim
git push heroku main
```

Deploy URL'ini not et: `https://your-app.railway.app`

---

## 🔗 Adım 3: Webhook Oluştur (GraphQL)

### GraphQL Playground'a Git:
```
https://api.myikas.com/api/v1/admin/graphql
```

### Authentication Header Ekle:
```json
{
  "Authorization": "Bearer YOUR_IKAS_API_TOKEN"
}
```

### Webhook Mutation Çalıştır:

**Sipariş Oluşturulduğunda:**
```graphql
mutation {
  saveWebhook(input: {
    scope: "store/order/created"
    endpoint: "https://your-app.railway.app/webhook/order"
  }) {
    webhook {
      id
      endpoint
      scope
    }
  }
}
```

**Sipariş Güncellendiğinde:**
```graphql
mutation {
  saveWebhook(input: {
    scope: "store/order/updated"
    endpoint: "https://your-app.railway.app/webhook/order"
  }) {
    webhook {
      id
      endpoint
      scope
    }
  }
}
```

---

## 📦 Olası Webhook Scope'ları

IKAS'ta muhtemelen şunlar mevcut:

- `store/order/created` - Yeni sipariş
- `store/order/updated` - Sipariş güncellendi
- `store/order/cancelled` - Sipariş iptal edildi
- `store/order/paid` - Sipariş ödendi
- `store/customer/created` - Yeni müşteri
- `store/customer/updated` - Müşteri güncellendi

**Not:** Tam liste için IKAS destek ekibine danış

---

## 🧪 Adım 4: Test Et

### 1. Webhook'u Listele:
```graphql
query {
  webhooks {
    id
    endpoint
    scope
  }
}
```

### 2. Test Siparişi Oluştur:
IKAS panelde test siparişi oluştur

### 3. Telegram'ı Kontrol Et:
Bildirim geldi mi?

### 4. Servis Loglarını Kontrol Et:
```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# Render
# Dashboard'da logs sekmesi
```

---

## ❌ Webhook'u Sil (İhtiyaç Halinde)

```graphql
mutation {
  deleteWebhook(id: "WEBHOOK_ID")
}
```

---

## 🔍 Sorun Giderme

### Webhook Gelmiyor:
1. ✅ URL doğru mu? (`/webhook/order` unutma)
2. ✅ Servis çalışıyor mu? → `https://your-app/health`
3. ✅ IKAS API token geçerli mi?
4. ✅ Scope doğru mu? (`store/order/created`)

### Telegram'a Gitmiyor:
1. ✅ Bot token doğru mu?
2. ✅ Chat ID doğru mu?
3. ✅ Servis loglarında hata var mı?

### HTTP 200 Dönmüyor:
IKAS webhook'ları 3 kez dener, HTTP 200 almazsa durur.
Servis loglarını kontrol et.

---

## 📊 IKAS Webhook Payload Örneği

IKAS muhtemelen şöyle bir payload gönderir:

```json
{
  "id": "order_123456",
  "orderNumber": "100045",
  "total": {
    "amount": 299.99,
    "currencyCode": "TRY"
  },
  "customer": {
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "email": "ahmet@example.com",
    "phone": "+905551234567"
  },
  "lineItems": [
    {
      "name": "Ürün Adı",
      "quantity": 2,
      "price": {
        "amount": 149.99
      }
    }
  ],
  "createdAt": "2025-01-19T10:00:00Z"
}
```

**Not:** Gerçek payload formatı farklı olabilir. İlk webhook geldiğinde logları kontrol et!

---

## 🎯 İlk Webhook Geldiğinde:

1. Server loglarına bak
2. Gelen payload'ı kaydet
3. Gerekirse `formatOrderMessage.js` dosyasını güncelle
4. Field mapping'i ayarla

---

## 💡 Pro Tips

1. **Test Environment:** Önce test mağazasında dene
2. **Logging:** Her webhook'u logla (troubleshooting için)
3. **Monitoring:** Uptime monitoring kur (UptimeRobot, Pingdom)
4. **Backup:** Birden fazla chat ID ekle (yedek bildirim)

---

## 📞 Yardım

Webhook kurulumunda sorun yaşarsan:
- IKAS Destek: support@ikas.com
- IKAS Dokümantasyon: https://ikas.dev/docs
- GraphQL Playground: https://api.myikas.com/api/v1/admin/graphql
