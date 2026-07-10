// models/Planning.js

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Planning = sequelize.define(
  "Planning",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "company_id",
    },

    agentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "agent_id",
    },

    siteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "site_id",
    },

    workDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "work_date",
    },

    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "start_time",
    },

    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "end_time",
    },

    gpsFrequencySeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: "gps_frequency_seconds",
      comment: "Envoi GPS automatique",
    },

    roundFrequencyMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      field: "round_frequency_minutes",
      comment: "Temps max entre deux rondes",
    },

    maxIdleMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: "max_idle_minutes",
      comment: "Temps max sans mouvement",
    },

    status: {
      type: DataTypes.ENUM("pending", "completed", "missed", "cancelled"),
      defaultValue: "pending",
    },
  },
  {
    tableName: "plannings",
    timestamps: true,
    underscored: true,
  },
);

export default Planning;
