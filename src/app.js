// src/app.js
// Main entry point — starts Express API and all BullMQ workers
require("dotenv").config();

const express = require("express");
const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
const jobRoutes = require("./routes/jobs");
app.use("/api/jobs", jobRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[App Error]", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start Workers ──────────────────────────────────────────────────────────
// Importing workers registers them — they start listening immediately
require("./workers/emailWorker");
require("./workers/paymentWorker");
require("./workers/notificationWorker");

// ── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Queue API running on http://localhost:${PORT}`);
  console.log(`   Workers: emailWorker, paymentWorker, notificationWorker\n`);
});

module.exports = app;
