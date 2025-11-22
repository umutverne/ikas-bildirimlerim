import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import { sendTelegramMessage } from './telegram.js';
import { formatOrderMessage } from './formatOrderMessage.js';
import { handleBotUpdate, sendOrderNotification } from './bot.js';
import { db_stores, db_users, db_notifications } from './database.js';
import { setupAdminRoutes } from './admin.js';
import { setupAuthRoutes } from './admin-routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.post('/bot/webhook', async (req, res) => {
  try {
    await handleBotUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Bot webhook error:', error);
    res.status(200).json({ ok: true });
  }
});

app.get('/test', async (req, res) => {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      return res.status(200).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>IKAS Bildirimlerim</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f5f5f5;
                padding: 20px;
              }
              .wrap {
                max-width: 480px;
                margin: 60px auto;
                background: white;
                padding: 32px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              h1 { font-size: 24px; margin-bottom: 12px; color: #1a1a1a; }
              p { color: #666; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <h1>Telegram ayarlanmamis</h1>
              <p>TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID degiskenlerini ayarla.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (req.query.send !== '1') {
      return res.status(200).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>IKAS Bildirimlerim</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f5f5f5;
                padding: 20px;
              }
              .wrap {
                max-width: 480px;
                margin: 60px auto;
                background: white;
                padding: 32px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              h1 { font-size: 24px; margin-bottom: 12px; color: #1a1a1a; }
              p { color: #666; line-height: 1.5; margin-bottom: 24px; }
              a {
                display: inline-block;
                background: #0066cc;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                text-decoration: none;
                font-size: 14px;
              }
              a:hover { background: #0052a3; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <h1>Test bildirimi</h1>
              <p>Telegram'a test bildirimi gonder.</p>
              <a href="/test?send=1">Bildirim gonder</a>
            </div>
          </body>
        </html>
      `);
    }

    const testOrders = [
      {
        customer: { fullName: "Ahmet Yilmaz", phone: "+905551234567" },
        totalFinalPrice: 450.00,
        orderLineItems: [
          { quantity: 1, variant: { name: "Premium T-Shirt" }, finalPrice: 250.00, currencyCode: "TRY" },
          { quantity: 2, variant: { name: "Cotton Socks" }, finalPrice: 100.00, currencyCode: "TRY" }
        ]
      },
      {
        customer: { fullName: "Ayse Demir", phone: "+905559876543" },
        totalFinalPrice: 890.50,
        orderLineItems: [
          { quantity: 1, variant: { name: "Winter Jacket" }, finalPrice: 890.50, currencyCode: "TRY" }
        ]
      },
      {
        customer: { fullName: "Mehmet Kaya", phone: "+905551112233" },
        totalFinalPrice: 325.00,
        orderLineItems: [
          { quantity: 3, variant: { name: "Basic T-Shirt" }, finalPrice: 75.00, currencyCode: "TRY" },
          { quantity: 1, variant: { name: "Denim Jeans" }, finalPrice: 250.00, currencyCode: "TRY" }
        ]
      },
      {
        customer: { fullName: "Zeynep Celik", phone: "+905554445566" },
        totalFinalPrice: 1250.00,
        orderLineItems: [
          { quantity: 2, variant: { name: "Leather Bag" }, finalPrice: 625.00, currencyCode: "TRY" }
        ]
      },
      {
        customer: { fullName: "Can Ozturk", phone: "+905557778899" },
        totalFinalPrice: 180.00,
        orderLineItems: [
          { quantity: 1, variant: { name: "Baseball Cap" }, finalPrice: 120.00, currencyCode: "TRY" },
          { quantity: 2, variant: { name: "Wristband" }, finalPrice: 30.00, currencyCode: "TRY" }
        ]
      }
    ];

    const randomOrder = testOrders[Math.floor(Math.random() * testOrders.length)];

    const testOrder = {
      data: JSON.stringify({
        orderNumber: "TEST-" + Math.floor(Math.random() * 9000 + 1000),
        customer: randomOrder.customer,
        totalFinalPrice: randomOrder.totalFinalPrice,
        currencyCode: "TRY",
        orderLineItems: randomOrder.orderLineItems,
        orderedAt: new Date().toISOString()
      })
    };

    const lang = process.env.LANGUAGE || 'tr';
    const message = formatOrderMessage(testOrder, lang);
    await sendTelegramMessage(message);

    res.status(200).send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>IKAS Bildirimlerim</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            .wrap {
              max-width: 480px;
              margin: 60px auto;
              background: white;
              padding: 32px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 {
              font-size: 24px;
              margin-bottom: 12px;
              color: #1a1a1a;
            }
            p {
              color: #666;
              line-height: 1.5;
              margin-bottom: 24px;
            }
            a {
              display: inline-block;
              background: #0066cc;
              color: white;
              padding: 10px 20px;
              border-radius: 4px;
              text-decoration: none;
              font-size: 14px;
            }
            a:hover { background: #0052a3; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>Gonderildi</h1>
            <p>Telegram'da kontrol et.</p>
            <a href="/test">Geri don</a>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    res.status(500).send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>IKAS Bildirimlerim</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            .wrap {
              max-width: 480px;
              margin: 60px auto;
              background: white;
              padding: 32px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 { font-size: 24px; margin-bottom: 12px; color: #d32f2f; }
            p { color: #666; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>Bir sorun olustu</h1>
            <p>${error.message}</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.post('/webhook/order', async (req, res) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'];
      if (providedSecret !== webhookSecret) {
        console.warn('⚠️  Invalid webhook secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const orderData = req.body;

    let parsedData = orderData;
    if (orderData.data && typeof orderData.data === 'string') {
      try {
        parsedData = JSON.parse(orderData.data);
      } catch (e) {
        parsedData = orderData;
      }
    }

    const authorizedAppId = orderData.authorizedAppId;
    const orderNumber = parsedData.orderNumber || parsedData.order_number || orderData.id || 'N/A';

    console.log('📥 Received order webhook:', {
      order_number: orderNumber,
      authorized_app_id: authorizedAppId,
      timestamp: new Date().toISOString()
    });

    if (!authorizedAppId) {
      console.warn('⚠️  No authorizedAppId in webhook');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const store = await db_stores.getByAppId(authorizedAppId);

    if (!store) {
      console.warn(`⚠️  Store not found for app ID: ${authorizedAppId}`);
      return res.status(200).json({ ok: true, skipped: true });
    }

    const users = await db_users.getByStore(store.id);

    if (users.length === 0) {
      console.log(`📭 No users registered for store: ${store.store_name}`);
      return res.status(200).json({ ok: true, skipped: true, reason: 'No users' });
    }

    const orderTotal = parsedData.totalFinalPrice || parsedData.total || 0;
    const minAmount = parseFloat(process.env.MIN_ORDER_AMOUNT) || 0;

    if (minAmount > 0 && orderTotal < minAmount) {
      console.log(`💰 Order total ${orderTotal} < MIN_ORDER_AMOUNT ${minAmount}, skipping notifications`);
      return res.status(200).json({ ok: true, skipped: true, reason: 'Below min amount' });
    }

    const lang = process.env.LANGUAGE || 'tr';
    const message = formatOrderMessage(parsedData, lang);

    let sentCount = 0;

    for (const user of users) {
      try {
        await sendOrderNotification(user.chat_id, message);
        await db_notifications.log(user.id, orderNumber, orderTotal);
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to user ${user.id}:`, error.message);
      }
    }

    console.log(`✅ Sent ${sentCount}/${users.length} notifications for order ${orderNumber}`);

    res.status(200).json({ ok: true, sent: sentCount });

  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

setupAuthRoutes(app);
setupAdminRoutes(app);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    ok: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 IKAS Bildirimlerim - Notification Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📨 Webhook endpoint: http://localhost:${PORT}/webhook/order`);
  console.log('');

  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log('✅ Telegram Bot configured');
  } else {
    console.log('⚠️  Telegram NOT configured - set TELEGRAM_BOT_TOKEN in .env');
  }

  const lang = process.env.LANGUAGE || 'tr';
  console.log(`🌍 Language: ${lang.toUpperCase()}`);

  const minAmount = parseFloat(process.env.MIN_ORDER_AMOUNT) || 0;
  if (minAmount > 0) {
    console.log(`💰 Minimum order amount filter: ${minAmount}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

export default app;
