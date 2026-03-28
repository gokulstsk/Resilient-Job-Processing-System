// src/workers/notificationWorker.js
// BullMQ worker for push/SMS notifications
const { Worker } = require("bullmq");
const { redisConnection } = require("../config/redis");
const JobService = require("../services/jobService");

async function sendNotification({ userId, channel, message }) {
  if (!userId || !channel || !message) {
    throw new Error("Missing required notification fields: userId, channel, message");
  }
  const validChannels = ["push", "sms", "in-app"];
  if (!validChannels.includes(channel)) {
    throw new Error(`Invalid channel "${channel}". Valid: ${validChannels.join(", ")}`);
  }

  // Simulate occasional failure
  if (Math.random() < 0.15) {
    throw new Error(`${channel.toUpperCase()} delivery failed for user ${userId}`);
  }

  console.log(`[Notification] Sent ${channel} to user ${userId}: "${message}"`);
  return { delivered: true, channel, userId };
}

const notificationWorker = new Worker(
  "notification",
  async (job) => {
    console.log(`[NotificationWorker] Processing job ${job.id}`);
    await JobService.markActive(job.id, job.attemptsMade + 1);

    const result = await sendNotification(job.data);
    await JobService.markCompleted(job.id, result);
    return result;
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

notificationWorker.on("failed", async (job, err) => {
  console.warn(`[NotificationWorker] Job ${job.id} failed: ${err.message}`);
  await JobService.markFailed(job.id, job.attemptsMade, err.message);

  const maxAttempts = job.opts.attempts || 2;
  if (job.attemptsMade >= maxAttempts) {
    await JobService.moveToDLQ("notification", job.data, job.attemptsMade, err.message);
  }
});

console.log("[NotificationWorker] Started — listening on 'notification' queue");
module.exports = notificationWorker;
