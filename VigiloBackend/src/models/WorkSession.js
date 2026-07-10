// models/WorkSession.js

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const WorkSession = sequelize.define(
  "WorkSession",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    planningId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "planning_id",
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

    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "company_id", // Assurez-vous de respecter le style underscore
      references: {
        model: "companies", // Nom de la table en base de données
        key: "id",
      },
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "started_at",
    },

    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ended_at",
    },

    status: {
      type: DataTypes.ENUM("active", "ended"),
      defaultValue: "active",
    },

    startLatitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      field: "start_latitude",
    },

    startLongitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      field: "start_longitude",
    },

    lastActivityAt: {
      type: DataTypes.DATE,
      field: "last_activity_at",
    },

    totalDistanceKm: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: "total_distance_km",
    },

    totalCheckpointsVisited: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "total_checkpoints_visited",
    },
  },
  {
    tableName: "work_sessions",
    timestamps: true,
    underscored: true,
  },
);

export default WorkSession;
