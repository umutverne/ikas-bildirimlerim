import { getMessages } from './languages.js';

function formatDate(dateString, lang = 'tr') {
  const msg = getMessages(lang);
  if (!dateString) return msg.unknown;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return msg.unknown;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return msg.unknown;
  }
}

function formatItems(items, lang = 'tr') {
  const msg = getMessages(lang);

  if (!items || !Array.isArray(items) || items.length === 0) {
    return `- ${msg.noProducts}`;
  }

  return items.map(item => {
    const qty = item.qty || item.quantity || 1;
    const name = item.name || item.product_name || item.title || msg.unknown;
    return `- ${qty}x ${name}`;
  }).join('\n');
}

export function formatOrderMessage(order, lang = 'tr') {
  const msg = getMessages(lang);

  if (!order || typeof order !== 'object') {
    return `🛒 ${msg.newOrder}!\n\n⚠️ ${msg.orderDataError}`;
  }

  const orderNumber = order.order_number || order.orderNumber || order.number || order.id || order.order_id || msg.unknown;

  const customerName = order.customer?.name ||
                       order.customer?.fullName ||
                       order.customer?.full_name ||
                       order.customerName ||
                       msg.unknown;

  const customerPhone = order.customer?.phone ||
                        order.customer?.phoneNumber ||
                        order.customer?.phone_number ||
                        order.phone ||
                        msg.unknown;

  const total = order.total || order.total_price || order.totalPrice || order.grand_total || 0;
  const currency = order.currency || order.currency_code || 'TRY';

  const items = order.items || order.line_items || order.products || [];

  const createdAt = order.created_at || order.createdAt || order.date || order.order_date || null;

  const message = `🛒 *${msg.newOrder}!*
#${orderNumber}

👤 *${msg.customer}:* ${customerName}
📱 *${msg.phone}:* ${customerPhone}
💰 *${msg.total}:* ${total} ${currency}

📦 *${msg.products}:*
${formatItems(items, lang)}

📅 *${msg.date}:* ${formatDate(createdAt, lang)}`;

  return message;
}
