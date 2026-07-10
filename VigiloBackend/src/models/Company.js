// models/Company.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import slugify from "slugify";
import countries from "i18n-iso-countries";
import { getTimezonesForCountry } from "countries-and-timezones";

const Company = sequelize.define(
  "Company",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    email: {
      type: DataTypes.STRING(100),
      validate: { isEmail: true },
      set(value) {
        this.setDataValue("email", value?.toLowerCase().trim());
      },
    },

    phone: DataTypes.STRING(20),
    address: DataTypes.STRING(255),
    country: DataTypes.STRING(100),

    countryCode: {
      type: DataTypes.STRING(5),
      field: "country_code",
    },

    timezone: {
      type: DataTypes.STRING,
      defaultValue: "UTC",
    },

    currency: {
      type: DataTypes.STRING(10),
      defaultValue: "USD",
    },

    logo: DataTypes.STRING,

    // ✅ STATUS CORRIGÉ
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },

    accountStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
      field: "account_status",
    },

    approvedAt: {
      type: DataTypes.DATE,
      field: "approved_at",
    },

    approvedBy: {
      type: DataTypes.UUID,
      field: "approved_by",
    },

    rejectionReason: {
      type: DataTypes.TEXT,
      field: "rejection_reason",
    },

    // ⭐ DOCUMENTS AJOUTÉS
    documents: {
      type: DataTypes.JSONB,
      defaultValue: {
        rccm: null,
        nif: null,
        other: null,
      },
    },
  },
  {
    tableName: "companies",
    timestamps: true,
    paranoid: true,
    underscored: true,
  },
);

// HOOK SLUG + COUNTRY
Company.beforeValidate((company) => {
  if (company.name && !company.slug) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    company.slug = `${slugify(company.name, { lower: true })}-${rand}`;
  }

  if (company.country) {
    const code =
      countries.getAlpha2Code(company.country, "en") ||
      countries.getAlpha2Code(company.country, "fr");

    if (code) {
      company.countryCode = code;

      const tz = getTimezonesForCountry(code);
      if (tz?.length) company.timezone = tz[0].name;
    }
  }
});

export default Company;
