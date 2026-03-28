// src/queues/jobQueue.js
// Defines BullMQ queues for different job types with smart retry config
const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis");

// Default job options — applied unless overridden per job
const defaultJobOptions = {
  attempts: 3,                          // max retry attempts
  backoff: {
    type: "exponential",                // 1s, 2s, 4s, ... between retries
    delay: 1000,
  },
  removeOnComplete: { count: 100 },    // keep last 100 completed jobs in Redis
  removeOnFail: false,                  // keep failed jobs for inspection
};

// One queue per job category — allows independent scaling and prioritisation
const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions,
});

const paymentQueue = new Queue("payment", {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,                        // payments get more retries
    priority: 1,                        // higher priority (lower number = higher)
  },
});

const notificationQueue = new Queue("notification", {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
});

// Helper: pick the right queue by job type
function getQueue(jobType) {
  const queues = { email: emailQueue, payment: paymentQueue, notification: notificationQueue };
  const queue = queues[jobType];
  if (!queue) throw new Error(`Unknown job type: "${jobType}"`);
  return queue;
}

module.exports = { emailQueue, paymentQueue, notificationQueue, getQueue };
