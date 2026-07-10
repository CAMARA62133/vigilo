import express from "express";
import upload from "../middlewares/uploads.js";

import {
  getAllAgents,
  getAgentById,
  updateAgent,
  createAgent,
} from "../controllers/agent.controller.js";

import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ================= AUTH GLOBAL =================
router.use(requireAuth);

// ================= CONFIG UPLOAD =================
const agentUpload = upload.fields([
  { name: "photoProfile", maxCount: 1 },
  { name: "identityDocument", maxCount: 1 },
]);

// ==================================================
// 1. ROUTES STATIQUES (SANS PARAMÈTRES)
// ==================================================



/**
 * 🔵 LIST & CREATE
 */
router
  .route("/")
  .get(requireRole("super_admin", "company_admin"), getAllAgents)
  .post(requireRole("super_admin", "company_admin"), agentUpload, createAgent);

// ==================================================
// 2. ROUTES DYNAMIQUES (AVEC PARAMÈTRES)
// ==================================================

/**
 * 🔵 SINGLE AGENT (ID en dernier)
 */
router
  .route("/:id")
  .get(requireRole("super_admin", "company_admin"), getAgentById)
  .put(requireRole("super_admin", "company_admin"), agentUpload, updateAgent);

export default router;
