import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Site = sequelize.define(
  "Site",
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

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    address: {
      type: DataTypes.STRING(255),
    },

    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    securityRadius: {
      type: DataTypes.FLOAT,
      defaultValue: 100,
      field: "security_radius",
    },

    // ✅ IMPORTANT
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "qr_code",
    },

    ownerInfo: {
      type: DataTypes.JSONB,
      defaultValue: {
        fullname: null,
        phone: null,
        email: null,
      },
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "sites",
    timestamps: true,
    underscored: true,

    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        fields: ["company_id"],
      },
    ],
  },
);

// ======================================================
// AUTO GENERATE CODE
// ======================================================
Site.beforeValidate((site) => {
  if (!site.code) {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();

    site.code = `SITE-${Date.now()}-${rand}`;
  }
});

export default Site;
