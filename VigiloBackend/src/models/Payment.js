import { DataTypes } from "sequelize";
import crypto from "crypto";
import { sequelize } from "../config/db.js";

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    planId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "GNF",
    },

    paymentMethod: {
      type: DataTypes.ENUM(
        "orange_money",
        "mtn_money",
        "bank_transfer",
        "cash",
        "card",
      ),
    },

    transactionReference: {
      type: DataTypes.STRING(120),
      unique: true,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ),
      defaultValue: "pending",
    },

    invoiceNumber: {
      type: DataTypes.STRING(50),
      unique: true,
    },

    billingPeriodStart: {
      type: DataTypes.DATEONLY,
    },

    billingPeriodEnd: {
      type: DataTypes.DATEONLY,
    },

    paidAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "payments",
    underscored: true,
    timestamps: true,

    createdAt: "created_at",
    updatedAt: "updated_at",

    indexes: [
      { fields: ["company_id"] },
      { fields: ["status"] },
      { fields: ["transaction_reference"] },
    ],
  },
);

// Génération sécurisée facture
Payment.beforeCreate(async (payment) => {
  if (!payment.invoiceNumber) {
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    payment.invoiceNumber = `INV-${new Date().getFullYear()}-${random}`;
  }

  if (!payment.transactionReference) {
    payment.transactionReference = `TXN-${crypto.randomUUID()}`;
  }
});

export default Payment;
