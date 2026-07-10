import express from "express";
import {
  getAllPlans,
  getPublicPlans,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlanStatus,
} from "../controllers/plan.controller.js";

import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🌍 PUBLIC ROUTE
// ======================
router.get("/public", getPublicPlans);

// ======================
// 🔐 PROTECTION GLOBAL
// ======================
router.use(requireAuth);


// ======================
// 📌 GET ALL PLANS (ADMIN)
// ======================
router.get("/", getAllPlans);

// ======================
// 📌 CREATE PLAN
// ======================
router.post("/", requireRole("super_admin"), createPlan);

// ======================
// 📌 UPDATE PLAN
// ======================
router.patch("/:id", requireRole("super_admin"), updatePlan);

// ======================
// 📌 TOGGLE STATUS
// ======================
router.patch(
  "/:id/toggle-status",
  requireRole("super_admin"),
  togglePlanStatus,
);

// ======================
// 📌 GET PLAN BY ID (⚠️ DOIT ÊTRE APRÈS ROUTES SPÉCIALES)
// ======================
router.get("/:id", getPlanById);

export default router;
