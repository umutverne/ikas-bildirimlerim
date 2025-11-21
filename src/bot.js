import axios from 'axios';
import { db_stores, db_users } from './database.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text, parseMode = null) {
  try {
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN is not configured!');
      throw new Error('BOT_TOKEN is not configured');
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });

    console.log(`✅ Message sent to ${chatId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Bot message send error:', {
      chatId,
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
}

export async function handleBotUpdate(update) {
  try {
    console.log('📨 Received bot update:', JSON.stringify(update));

    if (!update.message || !update.message.text) {
      console.log('⚠️  No message or text in update');
      return;
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const firstName = update.message.from.first_name || '';
    const lastName = update.message.from.last_name || '';
    const username = update.message.from.username || '';

    console.log(`📝 Processing command: ${text} from user ${chatId}`);

    if (text.startsWith('/start')) {
      await handleStart(chatId, firstName);
    } else if (text.startsWith('/bagla ')) {
      const code = text.replace('/bagla ', '').trim().toUpperCase();
      await handleConnect(chatId, code, firstName, lastName, username);
    } else if (text === '/durum') {
      await handleStatus(chatId);
    } else if (text === '/iptal') {
      await handleCancel(chatId);
    } else if (text === '/yardim') {
      await handleHelp(chatId);
    } else {
      await sendMessage(chatId, 'Bilinmeyen komut. /yardim yazarak komutlari gorebilirsin.');
    }
  } catch (error) {
    console.error('❌ Error handling bot update:', error);
    throw error;
  }
}

async function handleStart(chatId, firstName) {
  const user = await db_users.getByChatId(chatId);

  if (user) {
    await sendMessage(chatId,
      `👋 Tekrar hosgeldin ${firstName}!\n\n` +
      `✅ Aktif magazan: *${user.store_name}*\n\n` +
      `📋 Kullanilabilir komutlar:\n` +
      `• /durum - Baglanti durumunu gor\n` +
      `• /iptal - Bildirimleri kapat\n` +
      `• /yardim - Yardim al\n\n` +
      `Yeni siparisler icin bildirim alacaksin! 🔔`,
      'Markdown'
    );
  } else {
    await sendMessage(chatId,
      `👋 Merhaba ${firstName}!\n\n` +
      `🎉 IKAS Bildirimlerim'e hosgeldin!\n\n` +
      `Bu bot sayesinde magazandan gelen yeni siparisleri aninda Telegram'dan takip edebilirsin.\n\n` +
      `🔗 *Magazana Baglanmak icin:*\n` +
      `Asagidaki komutu kullan:\n` +
      `/bagla KOD\n\n` +
      `📌 Baglanti kodunu magazandan alabilirsin.\n\n` +
      `Sorularin mi var? /yardim yazarak yardim alabilirsin.`,
      'Markdown'
    );
  }
}

async function handleConnect(chatId, code, firstName, lastName, username) {
  const store = await db_stores.getByLinkCode(code);

  if (!store) {
    await sendMessage(chatId,
      `❌ *Gecersiz Kod!*\n\n` +
      `Girdigin kod: \`${code}\`\n\n` +
      `Lutfen:\n` +
      `• Kodu kontrol et ve tekrar dene\n` +
      `• Magazandan yeni kod al\n` +
      `• Bosluk birakmadigindan emin ol`,
      'Markdown'
    );
    return;
  }

  const result = await db_users.create(store.id, chatId, firstName, lastName, username);

  if (result.updated) {
    await sendMessage(chatId,
      `🔄 *Magaza Degistirildi!*\n\n` +
      `Yeni magazan: *${store.store_name}*\n\n` +
      `✅ Artik bu magazanin siparislerini alacaksin.\n` +
      `🔔 Bildirimler aktif!`,
      'Markdown'
    );
  } else {
    await sendMessage(chatId,
      `✅ *Basariyla Baglandi!*\n\n` +
      `🏪 Magazan: *${store.store_name}*\n\n` +
      `🎉 Harika! Artik yeni siparisler icin bildirim alacaksin.\n\n` +
      `📱 Durum gormek icin: /durum`,
      'Markdown'
    );
  }
}

async function handleStatus(chatId) {
  const user = await db_users.getByChatId(chatId);

  if (!user) {
    await sendMessage(chatId,
      `⚠️ *Henuz Bagli Degilsin*\n\n` +
      `Siparis bildirimleri almak icin bir magazaya baglanman gerekiyor.\n\n` +
      `🔗 Baglanmak icin:\n` +
      `/bagla KOD\n\n` +
      `Baglanti kodunu magazandan alabilirsin.`,
      'Markdown'
    );
    return;
  }

  await sendMessage(chatId,
    `📊 *Baglanti Durumu*\n\n` +
    `✅ Aktif\n\n` +
    `🏪 Magaza: *${user.store_name}*\n` +
    `📅 Baglanti tarihi: ${new Date(user.created_at).toLocaleDateString('tr-TR')}\n` +
    `🔔 Bildirimler: Aktif\n\n` +
    `Her yeni siparis icin bildirim alacaksin!`,
    'Markdown'
  );
}

async function handleCancel(chatId) {
  const user = await db_users.getByChatId(chatId);

  if (!user) {
    await sendMessage(chatId,
      `ℹ️ Zaten bir magazaya bagli degilsin.\n\n` +
      `Baglanti kurmak icin /bagla komutunu kullan.`
    );
    return;
  }

  await db_users.deactivate(chatId);

  await sendMessage(chatId,
    `🔕 *Bildirimler Kapatildi*\n\n` +
    `*${user.store_name}* magazasindan artik bildirim almayacaksin.\n\n` +
    `Tekrar baglanmak istersen:\n` +
    `/bagla KOD\n\n` +
    `Yardima ihtiyacin varsa /yardim yazabilirsin.`,
    'Markdown'
  );
}

async function handleHelp(chatId) {
  await sendMessage(chatId,
    `📚 *IKAS Bildirimlerim - Yardim*\n\n` +
    `*Kullanilabilir Komutlar:*\n\n` +
    `🏠 /start\n` +
    `Bota hosgeldin mesaji\n\n` +
    `🔗 /bagla KOD\n` +
    `Magazana baglan ve bildirimleri baslat\n` +
    `Ornek: \`/bagla ABC123\`\n\n` +
    `📊 /durum\n` +
    `Aktif baglanti durumunu gor\n\n` +
    `🔕 /iptal\n` +
    `Bildirimleri kapat\n\n` +
    `❓ /yardim\n` +
    `Bu yardim mesajini gor\n\n` +
    `──────────────\n` +
    `💡 *Ipucu:* Baglanti kodunu magazandan alabilirsin.`,
    'Markdown'
  );
}

export async function sendOrderNotification(chatId, message) {
  await sendMessage(chatId, message, 'Markdown');
}
