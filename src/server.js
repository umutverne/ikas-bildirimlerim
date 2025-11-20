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
