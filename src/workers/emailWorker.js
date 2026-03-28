// src/workers/emailWorker.js
// BullMQ worker for the 'email' queue with smart retry and DLQ handling
const { Worker } = require("bullmq");
const { redisConnection } = require("../config/redis");
const JobService = require("../services/jobService");

// ── Simulate sending an email ──────────────────────────────────────────────
// Replace this with your actual email provider (Nodemailer, SendGrid, etc.)
async function sendEmail({ to, subject, body }) {
  if (!to || !subject) throw new Error("Missing required email fields: to, subject");

  // Simulated random failure (30% chance) to demonstrate retry behaviour
  if (Math.random() < 0.3) {
    throw new Error(`SMTP connection refused for recipient: ${to}`);
  }

  console.log(`[Email] Sent to ${to} — subject: "${subject}"`);
  return { messageId: `msg-${Date.now()}`, deliveredTo: to };
}

// ── Worker ────────────────────────────────────────────────────────────────
const emailWorker = new Worker(
  "email",
  async (job) => {
    console.log(`[EmailWorker] Processing job ${job.id} (attempt ${job.attemptsMade + 1})`);

    // Mark active in MySQL
    await JobService.markActive(job.id, job.attemptsMade + 1);

    // Do the actual work
    const result = await sendEmail(job.data);

    // Persist success
    await JobService.markCompleted(job.id, result);
    console.log(`[EmailWorker] Job ${job.id} completed`);

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 5,   // process up to 5 email jobs in parallel
  }
);

// ── Event Listeners ───────────────────────────────────────────────────────

emailWorker.on("failed", async (job, err) => {
  console.warn(`[EmailWorker] Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
  await JobService.markFailed(job.id, job.attemptsMade, err.message);

  // If this was the last attempt, push to DLQ
  const maxAttempts = job.opts.attempts || 3;
  if (job.attemptsMade >= maxAttempts) {
    await JobService.moveToDLQ(
      job.id,
      "email",
      job.data,
      job.attemptsMade,
      err.message
    );
  }
});

emailWorker.on("error", (err) => {
  console.error("[EmailWorker] Worker error:", err.message);
});

console.log("[EmailWorker] Started — listening on 'email' queue");
module.exports = emailWorker;
