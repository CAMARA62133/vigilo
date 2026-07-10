import { sequelize } from "../config/db.js";
import { Op } from "sequelize";

// MODELS
import User from "./User.js";
import Company from "./Company.js";
import Agent from "./Agent.js";
import Site from "./Site.js";
import Checkpoint from "./Checkpoint.js";
import CheckpointPassage from "./CheckpointPassage.js";
import Payment from "./Payment.js";
import Plan from "./Plan.js";
import Notification from "./Notification.js";
import Log from "./Log.js";
import Planning from "./Planning.js";
import WorkSession from "./WorkSession.js";
import GpsPosition from "./GpsPosition.js";
import { Conversation, Message } from "./Chat.js";

// ======================================================
// 1. PLAN ↔ COMPANY
// ======================================================
Plan.hasMany(Company, {
  foreignKey: "planId",
  as: "companies",
});

Company.belongsTo(Plan, {
  foreignKey: "planId",
  as: "plan",
});

// ======================================================
// 2. COMPANY ↔ CORE
// ======================================================
Company.hasMany(User, {
  foreignKey: "companyId",
  as: "users",
});

User.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

Company.hasMany(Site, {
  foreignKey: "companyId",
  as: "sites",
});

Site.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

Company.hasMany(Payment, {
  foreignKey: "companyId",
  as: "payments",
});

Payment.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// ======================================================
// 3. USER ↔ AGENT
// ======================================================
User.hasOne(Agent, {
  foreignKey: "userId",
  as: "agentProfile",
});

Agent.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ======================================================
// 4. SITE ↔ CHECKPOINT
// ======================================================
Site.hasMany(Checkpoint, {
  foreignKey: "siteId",
  as: "checkpoints",
});

Checkpoint.belongsTo(Site, {
  foreignKey: "siteId",
  as: "site",
});

// ======================================================
// 5. PLANNING
// ======================================================
Company.hasMany(Planning, {
  foreignKey: "companyId",
  as: "plannings",
});

Planning.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

Agent.hasMany(Planning, {
  foreignKey: "agentId",
  as: "plannings",
});

Planning.belongsTo(Agent, {
  foreignKey: "agentId",
  as: "agent",
});

Site.hasMany(Planning, {
  foreignKey: "siteId",
  as: "plannings",
});

Planning.belongsTo(Site, {
  foreignKey: "siteId",
  as: "site",
});

// ======================================================
// 6. WORK SESSION
// ======================================================
Planning.hasMany(WorkSession, {
  foreignKey: "planningId",
  as: "sessions",
});

WorkSession.belongsTo(Planning, {
  foreignKey: "planningId",
  as: "planning",
});

Agent.hasMany(WorkSession, {
  foreignKey: "agentId",
  as: "sessions",
});

WorkSession.belongsTo(Agent, {
  foreignKey: "agentId",
  as: "agent",
});

Site.hasMany(WorkSession, {
  foreignKey: "siteId",
  as: "sessions",
});

WorkSession.belongsTo(Site, {
  foreignKey: "siteId",
  as: "site",
});
// Relation Company ↔ WorkSession
Company.hasMany(WorkSession, {
  foreignKey: "companyId",
  as: "workSessions",
});

WorkSession.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});
// ======================================================
// 7. GPS TRACKING
// ======================================================
WorkSession.hasMany(GpsPosition, {
  foreignKey: "workSessionId",
  as: "positions",
});

GpsPosition.belongsTo(WorkSession, {
  foreignKey: "workSessionId",
  as: "session",
});

// ======================================================
// 8. CHECKPOINT PASSAGES
// ======================================================
WorkSession.hasMany(CheckpointPassage, {
  foreignKey: "workSessionId",
  as: "checkpointPassages",
});

CheckpointPassage.belongsTo(WorkSession, {
  foreignKey: "workSessionId",
  as: "workSession",
});

CheckpointPassage.belongsTo(Checkpoint, {
  foreignKey: "checkpointId",
  as: "checkpoint",
});

// ======================================================
// 9. NOTIFICATIONS (REMPLACE ALERT SYSTEM)
// ======================================================
Company.hasMany(Notification, {
  foreignKey: "companyId",
  as: "notifications",
});

Notification.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

User.hasMany(Notification, {
  foreignKey: "userId",
  as: "notifications",
});

Notification.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

WorkSession.hasMany(Notification, {
  foreignKey: "workSessionId",
  as: "notifications",
});

Notification.belongsTo(WorkSession, {
  foreignKey: "workSessionId",
  as: "workSession",
});

Agent.hasMany(Notification, {
  foreignKey: "agentId",
  as: "notifications",
});

Notification.belongsTo(Agent, {
  foreignKey: "agentId",
  as: "agent",
});

// ======================================================
// 10. LOGS
// ======================================================
Company.hasMany(Log, {
  foreignKey: "companyId",
  as: "logs",
});

Log.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// ======================================================
// 11. CHAT SYSTEM
// ======================================================
Conversation.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

Company.hasMany(Conversation, {
  foreignKey: "companyId",
  as: "conversations",
});

Conversation.belongsTo(Site, {
  foreignKey: "siteId",
  as: "site",
});

Site.hasMany(Conversation, {
  foreignKey: "siteId",
  as: "conversations",
});

Conversation.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

Conversation.hasMany(Message, {
  foreignKey: "conversationId",
  as: "messages",
});

Message.belongsTo(Conversation, {
  foreignKey: "conversationId",
  as: "conversation",
});

Message.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

User.hasMany(Message, {
  foreignKey: "senderId",
  as: "messages",
});

Conversation.belongsTo(Message, {
  foreignKey: "lastMessageId",
  as: "lastMessage",
});

// ======================================================
// EXPORT
// ======================================================
export {
  sequelize,
  Op,
  User,
  Company,
  Agent,
  Site,
  Checkpoint,
  CheckpointPassage,
  Payment,
  Plan,
  Notification,
  Log,
  Planning,
  WorkSession,
  GpsPosition,
  Conversation,
  Message,
};
