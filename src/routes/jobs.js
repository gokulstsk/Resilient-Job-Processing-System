// src/routes/jobs.js
// Express routes: enqueue jobs, check status, view DLQ
const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { getQueue } = require("../queues/jobQueue");
const JobService = require("../services/jobService");

// ── POST /api/jobs — enqueue a new job ─────────────────────────────────────
// Body: { type: 'email'|'payment'|'notification', payload: {...}, options?: {...} }
router.post("/", async (req, res) => {
  try {
    const { type, payload, options = {} } = req.body;

    if (!type || !payload) {
      return res.status(400).json({ error: "Request body must include 'type' and 'payload'" });
    }

    const queue = getQueue(type);
    const jobId = uuidv4();

    // BullMQ job options — caller can override delay, priority, etc.
    const jobOptions = {
      jobId,
      delay: options.delay || 0,           // delay in ms (0 = immediate)
      priority: options.priority,           // lower = higher priority
      attempts: options.attempts,           // override queue default
    };

    const job = await queue.add(type, payload, jobOptions);

    // Persist initial state to MySQL
    const maxAttempts = options.attempts || (type === "payment" ? 5 : 3);
    await JobService.createLog(jobId, type, payload, maxAttempts);

    return res.status(202).json({
      message: "Job enqueued successfully",
      jobId: job.id,
      type,
      status: "waiting",
    });
  } catch (err) {
    console.error("[API] Enqueue error:", err.message);
    return res.status(err.message.startsWith("Unknown job type") ? 400 : 500).json({
      error: err.message,
    });
  }
});

// ── GET /api/jobs/:jobId — fetch job status from MySQL ─────────────────────
router.get("/:jobId", async (req, res) => {
  try {
    const log = await JobService.getJobLog(req.params.jobId);
    if (!log) {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.json(log);
  } catch (err) {
    console.error("[API] Status fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// ── GET /api/jobs/dlq/list — list dead-letter queue entries ───────────────
router.get("/dlq/list", async (req, res) => {
  try {
    const jobs = await JobService.getDLQJobs();
    return res.json({ count: jobs.length, jobs });
  } catch (err) {
    console.error("[API] DLQ fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch DLQ" });
  }
});

module.exports = router;
