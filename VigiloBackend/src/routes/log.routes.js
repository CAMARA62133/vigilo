import express from "express";
import {
  createLog,
  getAllLogs,
} from "../controllers/log.controller.js";

import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 PROTECTION GLOBALE
// ======================
router.use(requireAuth);

// ======================================================
// 1. ROUTES STATIQUES (SANS PARAMÈTRES)
// ======================================================



// ======================================================
// 2. ROUTES GÉNÉRIQUES (CRUD)
// ======================================================

/**
 * 📌 LIST & CREATE
 */
router.get("/", getAllLogs);
router.post("/", createLog);

export default router;
