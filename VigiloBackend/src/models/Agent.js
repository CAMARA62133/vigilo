import { DataTypes } from "sequelize";
import crypto from "crypto";
import { sequelize } from "../config/db.js";

const Agent = sequelize.define(
  "Agent",
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
    matricule: {
      type: DataTypes.STRING(50),
      unique: true,
    },
    // --- PIÈCE D'IDENTITÉ ---
    identityCard: {
      type: DataTypes.JSONB,
      field: "identity_card",
      defaultValue: {
        type: "CNI", // CNI, Passeport, Carte Électeur
        number: null,
        expiryDate: null,
        documentPath: null, // Chemin vers le scan/photo
      },
      comment: "Informations sur la pièce d'identité de l'agent",
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      field: "hire_date",
    },
    contractType: {
      type: DataTypes.ENUM("CDD", "CDI", "STAGIAIRE", "VACATAIRE"),
      defaultValue: "CDI",
      field: "contract_type",
    },
    // --- STATUT ET ACTIVITÉ ---
    status: {
      type: DataTypes.ENUM("idle", "working", "offline"),
      defaultValue: "idle",
    },

    // --- CONTACT D'URGENCE ---
    emergencyContact: {
      type: DataTypes.JSONB,
      field: "emergency_contact",
      defaultValue: { name: null, phone: null, relationship: null },
    },
  },
  {
    tableName: "agents",
    underscored: true,
    timestamps: true,
    paranoid: true,
  },
);

// Hook pour le matricule
Agent.beforeCreate((agent) => {
  if (!agent.matricule) {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    agent.matricule = `AGT-${year}-${random}`;
  }
});

export default Agent;
