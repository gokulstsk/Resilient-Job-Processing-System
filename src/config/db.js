// src/config/db.js
require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

const dialect = process.env.DB === "mysql" ? "mysql" : "postgres";

const sequelize = new Sequelize(
  process.env.DB_NAME || "smart_queue_db",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: dialect,
    logging: false,
    pool: {
      max: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT) : 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const JobLog = sequelize.define(
  "JobLog",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    job_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    job_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("waiting", "active", "completed", "failed", "dead"),
      allowNull: false,
      defaultValue: "waiting",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    result: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "job_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["job_id"] },
      { fields: ["status"] },
      { fields: ["job_type"] },
      { fields: ["created_at"] },
    ],
  }
);

const DeadLetterQueue = sequelize.define(
  "DeadLetterQueue",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    job_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    job_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    total_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    final_error: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    dead_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    reviewed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "dead_letter_queue",
    timestamps: false,
    indexes: [
      { fields: ["job_id"] },
      { fields: ["reviewed"] },
    ],
  }
);

// Test connection and sync models
sequelize
  .authenticate()
  .then(() => {
    console.log(`[DB] Database connected successfully via Sequelize (${dialect})`);
    return sequelize.sync({ alter: true }); // Using alter to avoid dropping tables in case schemas are different
  })
  .then(() => {
    console.log("[DB] Database synchronized successfully");
  })
  .catch((err) => {
    console.error("[DB] Database connection failed:", err.message);
  });

module.exports = { sequelize, JobLog, DeadLetterQueue };
