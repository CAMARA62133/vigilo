// models/CheckpointPassage.js

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CheckpointPassage = sequelize.define(
  "CheckpointPassage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    workSessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "work_session_id",
    },

    checkpointId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "checkpoint_id",
    },

    enteredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "entered_at",
    },
  },
  {
    tableName: "checkpoint_passages",
    timestamps: false,
    underscored: true,
  }
);

export default CheckpointPassage;