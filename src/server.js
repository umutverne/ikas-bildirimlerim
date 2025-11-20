import dotenv from 'dotenv';
import express from 'express';
import { sendTelegramMessage } from './telegram.js';
import { formatOrderMessage } from './formatOrderMessage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/test', async (req, res) => {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      return res.status(200).send(`
        <html>
          <head><title>Test - IKAS Bildirimlerim</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>⚠️ Telegram Not Configured</h1>
            <p>Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.</p>
          </body>
        </html>
      `);
    }

    const testOrder = {
      data: JSON.stringify({
        orderNumber: "TEST-" + Math.floor(Math.random() * 1000),
        customer: {
          fullName: "Test Kullanici",
          phone: "+905551234567"
        },
        totalFinalPrice: 299.90,
        currencyCode: "TRY",
        orderLineItems: [
          {
            quantity: 2,
            variant: { name: "Test Urun - Siyah" },
            finalPrice: 99.95,
            currencyCode: "TRY"
          },
          {
            quantity: 1,
            variant: { name: "Test Urun 2 - Beyaz" },
            finalPrice: 99.95,
            currencyCode: "TRY"
          }
        ],
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
          <title>Test Notification Sent</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .container {
              background: rgba(255,255,255,0.95);
              color: #333;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
            }
            h1 { color: #667eea; margin-bottom: 20px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            p { font-size: 18px; line-height: 1.6; }
            .btn {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              transition: all 0.3s;
            }
            .btn:hover { background: #764ba2; transform: translateY(-2px); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Test bildirimi gonderildi!</h1>
            <p>Telegram'inizi kontrol edin.</p>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              IKAS maganzanizdan gercek bir siparis geldiginde ayni sekilde bildirim alacaksiniz.
            </p>
            <a href="/test" class="btn">Tekrar Test Et</a>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>❌ Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

app.post('/webhook/order', async (req, res) => {
  try {
    const orderData = req.body;

    let parsedData = orderData;
    if (orderData.data && typeof orderData.data === 'string') {
      try {
        parsedData = JSON.parse(orderData.data);
      } catch (e) {
        parsedData = orderData;
      }
    }

    console.log('📥 Received order webhook:', {
      order_number: parsedData.orderNumber || parsedData.order_number || orderData.id || 'N/A',
      timestamp: new Date().toISOString()
    });

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.warn('⚠️  Telegram not configured - webhook received but cannot send notification');
      return res.status(200).json({
        ok: false,
        error: 'TELEGRAM_NOT_CONFIGURED'
      });
    }

    const minAmount = parseFloat(process.env.MIN_ORDER_AMOUNT) || 0;
    const orderTotal = parsedData.totalFinalPrice || parsedData.total || parsedData.total_price || parsedData.totalPrice || parsedData.grand_total || 0;

    if (orderTotal < minAmount) {
      console.log(`⏭️  Order skipped: ${orderTotal} < ${minAmount} (minimum threshold)`);
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'Order amount below minimum threshold'
      });
    }

    const lang = process.env.LANGUAGE || 'tr';
    const message = formatOrderMessage(orderData, lang);

    await sendTelegramMessage(message);

    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

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

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('✅ Telegram configured');
  } else {
    console.log('⚠️  Telegram NOT configured - set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
  }

  if (process.env.SMTP_HOST) {
    console.log('📧 Email configuration detected (not yet implemented)');
  }
  if (process.env.WHATSAPP_TOKEN) {
    console.log('📱 WhatsApp configuration detected (not yet implemented)');
  }

  const lang = process.env.LANGUAGE || 'tr';
  console.log(`🌍 Language: ${lang.toUpperCase()}`);

  const minAmount = parseFloat(process.env.MIN_ORDER_AMOUNT) || 0;
  if (minAmount > 0) {
    console.log(`💰 Minimum order amount filter: ${minAmount}`);
  }

  const chatIds = process.env.TELEGRAM_CHAT_ID?.split(',').length || 0;
  console.log(`👥 Notification recipients: ${chatIds}`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

export default app;
