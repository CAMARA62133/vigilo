import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Log = sequelize.define(
  "Log",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
    },
    moduleAffecte: {
      type: DataTypes.STRING(100),
    },
    details: {
      type: DataTypes.JSONB,
    },
  },
  {
    tableName: "logs",
    schema: process.env.DB_SCHEMA || "public",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["user"] },
      { fields: ["action"] },
      { fields: ["created_at"] },
      { fields: ["module_affecte"] },
    ],
  },
);

export default Log;
