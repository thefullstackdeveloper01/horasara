#!/usr/bin/env node
import { createApiServer } from './src/infrastructure/api/ApiServer.js';
import { calculateChart } from './src/engine/InternalCalculationEngine.js';
import { SubscriptionService } from './src/subscription/SubscriptionService.js';
import { createDefaultScheduler } from './src/subscription/ReportScheduler.js';
import { readFile } from 'node:fs/promises';
import { RazorpayPaymentService } from './src/payment/RazorpayPaymentService.js';

const subscriptionService = new SubscriptionService({filePath:process.env.HORASAAR_SUBSCRIPTIONS_FILE||'data/runtime/subscriptions.json'});
const paymentService = new RazorpayPaymentService();
const api = createApiServer({
  calculate: calculateChart,
  subscriptions: subscriptionService,
  paymentService,
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8787)
});
api.server.listen(api.port, api.host, () => console.log(`HoraSaar Enterprise API listening on http://${api.host}:${api.port}`));
process.on('SIGTERM', () => api.server.close(() => process.exit(0)));
process.on('SIGINT', () => api.server.close(() => process.exit(0)));
