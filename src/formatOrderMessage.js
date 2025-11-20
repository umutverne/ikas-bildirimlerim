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
    const qty = item.quantity || item.qty || 1;
    const name = item.variant?.name || item.name || item.product_name || item.title || msg.unknown;
    const price = item.finalPrice || item.price || item.discountPrice || 0;
    const currency = item.currencyCode || 'TRY';
    return `- ${qty}x ${name} (${price} ${currency})`;
  }).join('\n');
}

export function formatOrderMessage(order, lang = 'tr') {
  const msg = getMessages(lang);

  if (!order || typeof order !== 'object') {
    return `🛒 ${msg.newOrder}!\n\n⚠️ ${msg.orderDataError}`;
  }

  let orderData = order;

  if (order.data && typeof order.data === 'string') {
    try {
      orderData = JSON.parse(order.data);
    } catch (e) {
      orderData = order;
    }
  }

  const orderNumber = orderData.orderNumber || orderData.order_number || orderData.number || orderData.id || order.id || msg.unknown;

  const customerName = orderData.customer?.fullName ||
                       orderData.customer?.name ||
                       orderData.customer?.full_name ||
                       orderData.customerName ||
                       msg.unknown;

  let customerPhone = orderData.customer?.phone ||
                      orderData.customer?.phoneNumber ||
                      orderData.customer?.phone_number ||
                      orderData.phone ||
                      msg.unknown;

  if (customerPhone && customerPhone !== msg.unknown) {
    customerPhone = customerPhone.replace(/^\+90/, '0').replace(/\s+/g, '');
  }

  const total = orderData.totalFinalPrice || orderData.total || orderData.total_price || orderData.totalPrice || orderData.grand_total || 0;
  const currency = orderData.currencyCode || orderData.currency || orderData.currency_code || 'TRY';

  const items = orderData.orderLineItems || orderData.items || orderData.line_items || orderData.products || [];

  const createdAt = orderData.orderedAt || orderData.created_at || orderData.createdAt || orderData.date || orderData.order_date || null;

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
