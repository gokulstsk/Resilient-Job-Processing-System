// src/workers/paymentWorker.js
// BullMQ worker for the high-priority 'payment' queue
const { Worker } = require("bullmq");
const { redisConnection } = require("../config/redis");
const JobService = require("../services/jobService");

// ── Simulate payment processing ────────────────────────────────────────────
// Replace with your actual payment gateway (Stripe, Razorpay, etc.)
async function processPayment({ orderId, amount, currency, customerId }) {
  if (!orderId || !amount) throw new Error("Missing required payment fields: orderId, amount");
  if (amount <= 0) throw new Error(`Invalid payment amount: ${amount}`);

  // Simulated transient gateway failure (20% chance)
  if (Math.random() < 0.2) {
    throw new Error("Payment gateway timeout — will retry");
  }

  const txnId = `txn-${Date.now()}`;
  console.log(`[Payment] Processed ₹${amount} for order ${orderId} — txn: ${txnId}`);
  return { transactionId: txnId, orderId, status: "captured" };
}

// ── Worker ─────────────────────────────────────────────────────────────────
const paymentWorker = new Worker(
  "payment",
  async (job) => {
    console.log(`[PaymentWorker] Processing job ${job.id} (attempt ${job.attemptsMade + 1})`);
    await JobService.markActive(job.id, job.attemptsMade + 1);

    const result = await processPayment(job.data);
    await JobService.markCompleted(job.id, result);

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 3,   // fewer concurrent payment operations for safety
  }
);

paymentWorker.on("failed", async (job, err) => {
  console.warn(`[PaymentWorker] Job ${job.id} failed: ${err.message}`);
  await JobService.markFailed(job.id, job.attemptsMade, err.message);

  const maxAttempts = job.opts.attempts || 5;
  if (job.attemptsMade >= maxAttempts) {
    await JobService.moveToDLQ("payment", job.data, job.attemptsMade, err.message);
  }
});

paymentWorker.on("error", (err) => {
  console.error("[PaymentWorker] Worker error:", err.message);
});

console.log("[PaymentWorker] Started — listening on 'payment' queue");
module.exports = paymentWorker;
