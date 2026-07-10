// ============================================
// models/chat.model.js (VIGILO CLEAN PRO)
// ============================================

import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

/* ============================================
   CONVERSATION
============================================ */
export const Conversation = sequelize.define(
  "Conversation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: DataTypes.STRING,
    avatar: DataTypes.STRING,
    description: DataTypes.TEXT,

    type: {
      type: DataTypes.ENUM("INDIVIDUEL", "GROUPE", "URGENCE"),
      defaultValue: "INDIVIDUEL",
      allowNull: false,
    },

    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "company_id",
    },

    siteId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "site_id",
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },

    /* ============================================
       PARTICIPANTS (CLEAN - NO FULLNAME)
    ============================================ */
    participants: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,

      /**
       * [
       *  {
       *    userId,
       *    role: "MEMBER" | "ADMIN",
       *    companyId,
       *    siteId,
       *    joinedAt,
       *    canSendMessage,
       *    canAddUsers,
       *    canRemoveUsers
       *  }
       * ]
       */
    },

    lastMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "last_message_id",
    },

    unreadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "unread_count",
    },

    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_pinned",
    },

    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_muted",
    },

    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_archived",
    },

    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_locked",
    },
  },
  {
    tableName: "conversations",
    timestamps: true,
  },
);

/* ============================================
   MESSAGE
============================================ */
export const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "conversation_id",
    },

    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "sender_id",
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    type: {
      type: DataTypes.ENUM(
        "TEXTE",
        "IMAGE",
        "FICHIER",
        "GEOLOCALISATION",
        "URGENCE",
      ),
      defaultValue: "TEXTE",
    },

    status: {
      type: DataTypes.ENUM("ENVOYÉ", "LIVRÉ", "LU"),
      defaultValue: "ENVOYÉ",
    },

    readBy: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    replyToId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    geolocation: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    isUrgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    emergencyType: {
      type: DataTypes.ENUM(
        "INCIDENT",
        "VOL",
        "AGRESSION",
        "INCENDIE",
        "PANNE",
        "AUTRE",
      ),
      allowNull: true,
    },

    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "messages",
    timestamps: true,
  },
);
