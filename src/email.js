export async function sendEmailNotification(orderData) {
  throw new Error('Email notifications not yet implemented - Phase 2');
}

export function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}
