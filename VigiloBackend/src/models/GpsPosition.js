// models/GpsPosition.js

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const GpsPosition = sequelize.define(
  "GpsPosition",
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

    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    speed: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    isMocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_mocked",
      comment: "GPS falsifié",
    },
  },
  {
    tableName: "gps_positions",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

export default GpsPosition;
