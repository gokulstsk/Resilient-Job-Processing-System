-- ============================================================
-- Smart Queue + Retry System — MySQL Schema
-- Run this in MySQL Workbench before starting the application
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_queue_db;
USE smart_queue_db;

-- Jobs audit table: records every job lifecycle event
CREATE TABLE IF NOT EXISTS job_logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id        VARCHAR(100)  NOT NULL,             -- BullMQ job ID
  job_type      VARCHAR(100)  NOT NULL,             -- e.g. 'email', 'payment', 'notification'
  payload       JSON          NOT NULL,             -- original job data
  status        ENUM('waiting','active','completed','failed','dead') NOT NULL DEFAULT 'waiting',
  attempts      INT           NOT NULL DEFAULT 0,   -- how many times it was tried
  max_attempts  INT           NOT NULL DEFAULT 3,
  result        JSON          NULL,                 -- success result from worker
  error_message TEXT          NULL,                 -- last error if failed
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_id   (job_id),
  INDEX idx_status   (status),
  INDEX idx_job_type (job_type),
  INDEX idx_created  (created_at)
);

-- Dead Letter Queue table: permanently failed jobs for manual review
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id        VARCHAR(100)  NOT NULL,
  job_type      VARCHAR(100)  NOT NULL,
  payload       JSON          NOT NULL,
  total_attempts INT          NOT NULL,
  final_error   TEXT          NOT NULL,
  dead_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed      BOOLEAN       NOT NULL DEFAULT FALSE,
  reviewed_at   DATETIME      NULL,
  notes         TEXT          NULL,
  INDEX idx_job_id  (job_id),
  INDEX idx_reviewed (reviewed)
);
