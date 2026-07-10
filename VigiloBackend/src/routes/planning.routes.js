import express from "express";
import { planningController } from "../controllers/Planning.controller.js";
import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 GLOBAL AUTH
// ======================
router.use(requireAuth);

// ======================================================
// 📌 CREATE PLANNING (ADMIN ONLY)
// ======================================================
router.post(
  "/",
  requireRole("super_admin", "company_admin"),
  planningController.create,
);

// ======================================================
// 📌 GET ALL PLANNINGS (ADMIN + AGENT + MOBILE)
// ======================================================
// ⚠️ IMPORTANT: plus de restriction ici
router.get("/", planningController.getAll);

// ======================================================
// 📌 GET ONE PLANNING (ADMIN + AGENT OWN CHECK INSIDE CONTROLLER)
// ======================================================
router.get(
  "/:id",
  requireRole("super_admin", "company_admin"),
  planningController.getOne,
);

// ======================================================
// 📌 UPDATE PLANNING (ADMIN ONLY)
// ======================================================
router.put(
  "/:id",
  requireRole("super_admin", "company_admin"),
  planningController.update,
);

// ======================================================
// 📌 CANCEL PLANNING (ADMIN ONLY)
// ======================================================
router.post(
  "/:id/cancel",
  requireRole("super_admin", "company_admin"),
  planningController.cancel,
);

export default router;
