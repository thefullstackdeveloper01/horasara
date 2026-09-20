import { createDeliveryTransports } from './DeliveryService.js';

export async function sendSubscriptionConfirmation(subscription, plan, env=process.env) {
  if (String(env.SUBSCRIPTION_CONFIRMATION_EMAIL ?? 'true') === 'false') return {status:'disabled'};
  if (!subscription?.email) return {status:'skipped', reason:'no_email'};
  const transports = await createDeliveryTransports(env);
  const subject = `HoraSaar subscription activated — ${plan?.label || 'Personal Jyotish reports'}`;
  const text = [
    `Namaste ${subscription.name},`,
    '',
    'Your HoraSaar subscription is active.',
    `Plan: ${plan?.label || subscription.billingPeriod || 'subscription'}`,
    `Report: ${subscription.report || 'daily'}`,
    `Delivery: 07:00 in ${subscription.timezone || 'Asia/Kolkata'}`,
    '',
    'Your reports are generated from your saved birth details and selected preferences.',
    'You can manage or unsubscribe from your subscription using the private management link provided after checkout.',
    '',
    'HoraSaar'
  ].join('\\n');
  const html = `<!doctype html><html><body><h2>HoraSaar subscription activated</h2><p>Namaste ${String(subscription.name || '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))},</p><p>Your subscription is active.</p><ul><li>Plan: ${String(plan?.label || subscription.billingPeriod || 'subscription')}</li><li>Report: ${String(subscription.report || 'daily')}</li><li>Delivery: 07:00 in ${String(subscription.timezone || 'Asia/Kolkata')}</li></ul><p>Your reports are personalized from your saved birth details and selected preferences.</p><p>HoraSaar</p></body></html>`;
  return transports.email.send({to:subscription.email,subject,text,html,subscriptionId:subscription.id});
}
