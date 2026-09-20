import crypto from 'node:crypto';

const API_BASE = 'https://api.razorpay.com/v1';

function hmacHex(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export class RazorpayPaymentService {
  constructor({ keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET, webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET, currency = process.env.RAZORPAY_CURRENCY || 'INR' } = {}) {
    this.keyId = keyId || '';
    this.keySecret = keySecret || '';
    this.webhookSecret = webhookSecret || '';
    this.currency = currency;
  }

  isConfigured() { return Boolean(this.keyId && this.keySecret); }

  publicConfig() {
    return {
      provider: 'razorpay', configured: this.isConfigured(), keyId: this.keyId || null, currency: this.currency,
      checkoutUrl: 'https://checkout.razorpay.com/v1/checkout.js',
      paymentMethods: ['credit_card','debit_card','prepaid_card','upi','netbanking','wallet','emi','paylater','international_card']
    };
  }

  async request(path, { method='GET', body } = {}) {
    if (!this.isConfigured()) throw new Error('RAZORPAY_NOT_CONFIGURED');
    const headers = { Authorization:`Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`, Accept:'application/json' };
    if (body !== undefined) headers['content-type']='application/json';
    const response = await fetch(`${API_BASE}${path}`, {method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const raw = await response.text();
    let data; try { data=JSON.parse(raw); } catch { data={raw}; }
    if (!response.ok) {
      const err=new Error(data?.error?.description || data?.error?.reason || `Razorpay API HTTP ${response.status}`);
      err.statusCode=response.status; err.provider=data; throw err;
    }
    return data;
  }

  async createOrder({amountInr, receipt, notes={}}) {
    const amount=Math.round(Number(amountInr)*100);
    if (!Number.isInteger(amount) || amount<100) throw new Error('amountInr must be at least 1 INR');
    return this.request('/orders',{method:'POST',body:{amount,currency:this.currency,receipt:String(receipt).slice(0,40),notes}});
  }

  async fetchOrder(orderId) { return this.request(`/orders/${encodeURIComponent(orderId)}`); }
  async fetchPayment(paymentId) { return this.request(`/payments/${encodeURIComponent(paymentId)}`); }

  verifyCheckoutSignature({orderId,paymentId,signature}) {
    if (!this.keySecret) throw new Error('RAZORPAY_KEY_SECRET_NOT_CONFIGURED');
    if (!orderId || !paymentId || !signature) return false;
    return safeEqual(hmacHex(`${orderId}|${paymentId}`,this.keySecret),signature);
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!this.webhookSecret) throw new Error('RAZORPAY_WEBHOOK_SECRET_NOT_CONFIGURED');
    if (!signature) return false;
    return safeEqual(hmacHex(rawBody,this.webhookSecret),signature);
  }
}
