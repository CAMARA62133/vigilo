import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Plan = sequelize.define(
  "Plan",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // --- IDENTITÉ ---
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    code: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
    },

    // --- PRICING ---
    priceMonthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // --- QUOTAS CENTRALISÉS ---
    quotas: {
      type: DataTypes.JSONB,
      defaultValue: {
        maxAgents: 5,
        maxSites: 3,
        maxCheckpoints: 50,
      },
    },

    // --- FEATURES STRUCTURÉES ---
    features: {
      type: DataTypes.JSONB,
      defaultValue: {
        reports: true,
        messaging: false,
        ai_chat: false,
      },
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "plans",
    timestamps: true,
    underscored: true,
  },
);

export default Plan;
