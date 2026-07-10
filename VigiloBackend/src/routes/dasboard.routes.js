import express from "express";
import { requireAuth, } from "../middlewares/authMiddlewares.js";
import { getDashboardStats } from "../controllers/dasboard.controller.js";

const router = express.Router();

/**
 * 📊 DASHBOARD STATS (SaaS + Company)
 * Accessible uniquement aux utilisateurs connectés
 */
router.get("/stats", requireAuth, getDashboardStats);

export default router;
