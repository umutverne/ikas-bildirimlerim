import axios from 'axios';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendToSingleChat(botToken, chatId, text, retries = 3) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      console.log(`✅ Telegram message sent successfully to chat ${chatId}`);
      return response.data;

    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${retries} failed for chat ${chatId}:`, error.message);

      if (attempt === retries) {
        if (error.response) {
          throw new Error(`Telegram API error: ${error.response.data.description || error.message}`);
        } else if (error.request) {
          throw new Error('No response from Telegram API - check your internet connection');
        } else {
          throw new Error(`Failed to send Telegram message: ${error.message}`);
        }
      }

      await sleep(1000 * attempt);
    }
  }
}

export async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatIds) {
    throw new Error('TELEGRAM_NOT_CONFIGURED: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Message text cannot be empty');
  }

  const chatIdList = chatIds.split(',').map(id => id.trim()).filter(id => id.length > 0);

  if (chatIdList.length === 0) {
    throw new Error('No valid chat IDs found');
  }

  const results = [];
  const errors = [];

  for (const chatId of chatIdList) {
    try {
      const result = await sendToSingleChat(botToken, chatId, text);
      results.push({ chatId, success: true, data: result });
    } catch (error) {
      console.error(`Failed to send to chat ${chatId} after all retries`);
      errors.push({ chatId, error: error.message });
      results.push({ chatId, success: false, error: error.message });
    }
  }

  if (errors.length === chatIdList.length) {
    throw new Error(`Failed to send message to all chats: ${errors.map(e => e.error).join(', ')}`);
  }

  return results;
}
