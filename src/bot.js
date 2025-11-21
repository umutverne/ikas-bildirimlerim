import axios from 'axios';
import { db_stores, db_users } from './database.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text, parseMode = null) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    console.error('Bot message send error:', error.message);
  }
}

export async function handleBotUpdate(update) {
  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();
  const firstName = update.message.from.first_name || '';
  const lastName = update.message.from.last_name || '';
  const username = update.message.from.username || '';

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
}

async function handleStart(chatId, firstName) {
  const user = db_users.getByChatId(chatId);

  if (user) {
    await sendMessage(chatId,
      `Tekrar hosgeldin ${firstName}!\n\n` +
      `Aktif magazan: ${user.store_name}\n\n` +
      `Komutlar:\n` +
      `/durum - Bagli magazani gor\n` +
      `/iptal - Bildirimleri iptal et\n` +
      `/yardim - Yardim`
    );
  } else {
    await sendMessage(chatId,
      `Hosgeldin ${firstName}!\n\n` +
      `IKAS siparis bildirimlerine hosgeldin.\n\n` +
      `Magazana baglanmak icin:\n` +
      `/bagla KOD\n\n` +
      `Magazandan aldigin baglanti kodunu kullan.`
    );
  }
}

async function handleConnect(chatId, code, firstName, lastName, username) {
  const store = db_stores.getByLinkCode(code);

  if (!store) {
    await sendMessage(chatId,
      `Kod gecersiz: ${code}\n\n` +
      `Lutfen dogru kodu gir veya magazandan yeni kod al.`
    );
    return;
  }

  const result = db_users.create(store.id, chatId, firstName, lastName, username);

  if (result.updated) {
    await sendMessage(chatId,
      `Magaza degistirildi!\n\n` +
      `Yeni magaza: ${store.store_name}\n\n` +
      `Artik bu magazanin siparislerini alacaksin.`
    );
  } else {
    await sendMessage(chatId,
      `Basariyla baglandi!\n\n` +
      `Magaza: ${store.store_name}\n\n` +
      `Artik yeni siparisler icin bildirim alacaksin.`
    );
  }
}

async function handleStatus(chatId) {
  const user = db_users.getByChatId(chatId);

  if (!user) {
    await sendMessage(chatId,
      `Henuz bir magazaya bagli degilsin.\n\n` +
      `Baglanmak icin:\n` +
      `/bagla KOD`
    );
    return;
  }

  await sendMessage(chatId,
    `Aktif durumdasin\n\n` +
    `Magaza: ${user.store_name}\n` +
    `Baglanti tarihi: ${new Date(user.created_at).toLocaleDateString('tr-TR')}\n\n` +
    `Siparis bildirimleri aktif.`
  );
}

async function handleCancel(chatId) {
  const user = db_users.getByChatId(chatId);

  if (!user) {
    await sendMessage(chatId, 'Zaten bir magazaya bagli degilsin.');
    return;
  }

  db_users.deactivate(chatId);

  await sendMessage(chatId,
    `Bildirimler iptal edildi.\n\n` +
    `Artik ${user.store_name} magazasindan bildirim almayacaksin.\n\n` +
    `Tekrar baglanmak icin /bagla komutunu kullan.`
  );
}

async function handleHelp(chatId) {
  await sendMessage(chatId,
    `IKAS Bildirimlerim - Komutlar\n\n` +
    `/start - Baslangic\n` +
    `/bagla KOD - Magazaya baglan\n` +
    `/durum - Aktif durum\n` +
    `/iptal - Bildirimleri iptal et\n` +
    `/yardim - Bu mesaj`
  );
}

export async function sendOrderNotification(chatId, message) {
  await sendMessage(chatId, message, 'Markdown');
}
