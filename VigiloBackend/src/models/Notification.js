// models/Notification.js

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // Type métier
    type: {
      type: DataTypes.ENUM(
        "checkpoint",
        "geofence",
        "outside_geofence",
        "emergency",
        "idle",
        "alert",
      ),
      defaultValue: "alert",
    },

    // Niveau de gravité
    severity: {
      type: DataTypes.ENUM("info", "success", "warning", "danger"),
      defaultValue: "info",
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_read",
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    underscored: true,
  },
);

export default Notification;
