// models/Checkpoint.js

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Checkpoint = sequelize.define(
  "Checkpoint",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Site associé
    siteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "site_id",
    },

    // Nom du checkpoint
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Code unique lisible
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    // Coordonnées GPS
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    // Rayon GPS autorisé
    radius: {
      type: DataTypes.FLOAT,
      defaultValue: 20,

      comment: "Zone GPS du checkpoint en mètres",
    },

    // Ordre de ronde
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 1,

      comment: "Ordre de passage pendant la ronde",
    },

    // Activation
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },

  {
    tableName: "checkpoints",

    timestamps: true,

    underscored: true,

    indexes: [
      {
        unique: true,
        fields: ["code"],
      },

      {
        fields: ["site_id"],
      },

      {
        fields: ["is_active"],
      },
    ],

    hooks: {
      beforeValidate: async (checkpoint) => {
        // Génération code unique
        if (!checkpoint.code) {
          const random = Math.floor(1000 + Math.random() * 9000);

          checkpoint.code = `CHK-${random}`;
        }
      },
    },
  },
);

export default Checkpoint;
