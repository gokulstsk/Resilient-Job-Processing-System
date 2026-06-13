// src/services/jobService.js
// Persists job lifecycle events (created, completed, failed, dead) to MySQL
const db = require("../config/db");

const JobService = {
  // Called when a job is first enqueued via the API
  async createLog(jobId, jobType, payload, maxAttempts = 3) {
    await db.execute(
      `INSERT INTO job_logs (job_id, job_type, payload, status, max_attempts)
       VALUES (?, ?, ?, 'waiting', ?)`,
      [jobId, jobType, JSON.stringify(payload), maxAttempts]
    );
  },

  // Called by a worker when it picks up a job
  async markActive(jobId, attempts) {
    await db.execute(
      `UPDATE job_logs SET status = 'active', attempts = ? WHERE job_id = ?`,
      [attempts, jobId]
    );
  },

  // Called on successful job completion
  async markCompleted(jobId, result) {
    await db.execute(
      `UPDATE job_logs SET status = 'completed', result = ? WHERE job_id = ?`,
      [JSON.stringify(result), jobId]
    );
  },

  // Called on each failed attempt (will retry if attempts < max)
  async markFailed(jobId, attempts, errorMessage) {
    await db.execute(
      `UPDATE job_logs SET status = 'failed', attempts = ?, error_message = ? WHERE job_id = ?`,
      [attempts, errorMessage, jobId]
    );
  },

  // Called when max retries are exhausted — move to DLQ
  async moveToDLQ(jobId, jobType, payload, totalAttempts, finalError) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE job_logs SET status = 'dead' WHERE job_id = ?`,
        [jobId]
      );
      await conn.execute(
        `INSERT INTO dead_letter_queue (job_id, job_type, payload, total_attempts, final_error)
         VALUES (?, ?, ?, ?, ?)`,
        [jobId, jobType, JSON.stringify(payload), totalAttempts, finalError]
      );
      await conn.commit();
      console.log(`[DLQ] Job ${jobId} moved to dead letter queue after ${totalAttempts} attempts`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Fetch all job logs for the dashboard
  async getAllJobLogs() {
    const [rows] = await db.execute(
      `SELECT * FROM job_logs ORDER BY created_at DESC LIMIT 500`
    );
    return rows;
  },

  // Fetch job history for the status API
  async getJobLog(jobId) {
    const [rows] = await db.execute(
      `SELECT * FROM job_logs WHERE job_id = ?`,
      [jobId]
    );
    return rows[0] || null;
  },

  // Fetch all DLQ entries pending review
  async getDLQJobs() {
    const [rows] = await db.execute(
      `SELECT * FROM dead_letter_queue WHERE reviewed = FALSE ORDER BY dead_at DESC LIMIT 100`
    );
    return rows;
  },
};

module.exports = JobService;
