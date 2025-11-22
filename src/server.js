import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
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
