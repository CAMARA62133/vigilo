// routes/checkpointRoutes.js

import express from "express";
import { checkpointController } from "../controllers/checkpoint.controller.js";
import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 GLOBAL AUTH
// ======================
router.use(requireAuth);

// =====================================================
// 📌 CREATE CHECKPOINT
// =====================================================
router.post(
  "/",
  requireRole("super_admin", "company_admin"),
  checkpointController.create,
);

// =====================================================
// 📌 GET CHECKPOINTS BY SITE
// =====================================================
router.get(
  "/site/:siteId",
  requireRole("super_admin", "company_admin", "agent"),
  checkpointController.getBySite,
);

// =====================================================
// 📌 UPDATE CHECKPOINT
// =====================================================
router.put(
  "/:id",
  requireRole("super_admin", "company_admin"),
  checkpointController.update,
);

// =====================================================
// 📌 TOGGLE CHECKPOINT STATUS
// =====================================================
router.patch(
  "/:id/toggle",
  requireRole("super_admin", "company_admin"),
  checkpointController.toggleStatus,
);

export default router;
