export async function sendWhatsAppNotification(orderData, recipientPhone) {
  throw new Error('WhatsApp notifications not yet implemented - Phase 3');
}

export function isWhatsAppConfigured() {
  return !!(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_ID
  );
}

function createWhatsAppTemplate(orderData) {
  return {
    messaging_product: 'whatsapp',
    to: '',
    type: 'template',
    template: {
      name: 'order_notification',
      language: { code: 'tr' },
      components: []
    }
  };
}
