// src/routes/jobs.js
// Express routes: enqueue jobs, check status, view DLQ
const express = require("express");
const router = express.Router();


const cntrl = require("../controller/jobs");

// ── POST /api/jobs — enqueue a new job ─────────────────────────────────────
// Body: { type: 'email'|'payment'|'notification', payload: {...}, options?: {...} }
router.post("/", cntrl.createJob);

// ── GET /api/jobs/all/logs — list all job logs ───────────────
router.get("/all/logs", cntrl.getAllJobs);

// ── GET /api/jobs/:jobId — fetch job status from MySQL ─────────────────────
router.get("/:jobId", cntrl.updatejobById);

// ── GET /api/jobs/dlq/list — list dead-letter queue entries ───────────────
router.get("/dlq/list", cntrl.deadLetterQueueList);

module.exports = router;
