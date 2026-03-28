// src/config/redis.js
const { Redis } = require("ioredis");
require("dotenv").config();

const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME || "default", // 👈 IMPORTANT
  password: process.env.REDIS_PASSWORD,              // 👈 REQUIRED
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("connect", () => console.log("[Redis] Connected"));
redisConnection.on("error", (err) =>
  console.error("[Redis] Error:", err.message)
);

module.exports = { redisConnection };