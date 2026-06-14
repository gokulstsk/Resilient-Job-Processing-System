// src/services/jobService.js
// Persists job lifecycle events (created, completed, failed, dead) using Sequelize
const { sequelize, JobLog, DeadLetterQueue } = require("../config/db");

const JobService = {
  // Called when a job is first enqueued via the API
  async createLog(jobId, jobType, payload, maxAttempts = 3) {
    await JobLog.create({
      job_id: jobId,
      job_type: jobType,
      payload: payload,
      status: "waiting",
      max_attempts: maxAttempts,
    });
  },

  // Called by a worker when it picks up a job
  async markActive(jobId, attempts) {
    await JobLog.update(
      { status: "active", attempts: attempts },
      { where: { job_id: jobId } }
    );
  },

  // Called on successful job completion
  async markCompleted(jobId, result) {
    await JobLog.update(
      { status: "completed", result: result },
      { where: { job_id: jobId } }
    );
  },

  // Called on each failed attempt (will retry if attempts < max)
  async markFailed(jobId, attempts, errorMessage) {
    await JobLog.update(
      { status: "failed", attempts: attempts, error_message: errorMessage },
      { where: { job_id: jobId } }
    );
  },

  // Called when max retries are exhausted — move to DLQ
  async moveToDLQ(jobId, jobType, payload, totalAttempts, finalError) {
    const transaction = await sequelize.transaction();
    try {
      await JobLog.update(
        { status: "dead" },
        { where: { job_id: jobId }, transaction }
      );

      await DeadLetterQueue.create(
        {
          job_id: jobId,
          job_type: jobType,
          payload: payload,
          total_attempts: totalAttempts,
          final_error: finalError,
        },
        { transaction }
      );

      await transaction.commit();
      console.log(`[DLQ] Job ${jobId} moved to dead letter queue after ${totalAttempts} attempts`);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // Fetch all job logs for the dashboard
  async getAllJobLogs() {
    const logs = await JobLog.findAll({
      order: [["created_at", "DESC"]],
      limit: 500,
      raw: true,
    });
    return logs;
  },

  // Fetch job history for the status API
  async getJobLog(jobId) {
    const log = await JobLog.findOne({
      where: { job_id: jobId },
      raw: true,
    });
    return log || null;
  },

  // Fetch all DLQ entries pending review
  async getDLQJobs() {
    const dlqJobs = await DeadLetterQueue.findAll({
      where: { reviewed: false },
      order: [["dead_at", "DESC"]],
      limit: 100,
      raw: true,
    });
    return dlqJobs;
  },
};

module.exports = JobService;
