// routes/siteRoutes.js
import express from "express";
import { siteController } from "../controllers/site.controller.js";
import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 GLOBAL AUTH
// ======================
router.use(requireAuth);

// ======================
// 📌 CREATE SITE (ADMIN ONLY)
// ======================
router.post(
  "/",
  requireRole("super_admin", "company_admin"),
  siteController.create,
);

// ======================
// 📌 GET ALL SITES (ADMIN + AGENT)
// ======================
router.get(
  "/",
  requireRole("super_admin", "company_admin", "agent"),
  siteController.getAll,
);

// ======================
// 📌 GET ONE SITE (ADMIN + AGENT)
// ======================
router.get(
  "/:id",
  requireRole("super_admin", "company_admin", "agent"),
  siteController.getOne,
);

// ======================
// 📌 UPDATE SITE (ADMIN ONLY)
// ======================
router.put(
  "/:id",
  requireRole("super_admin", "company_admin"),
  siteController.update,
);
// ======================
// 📌 TOGGLE SITE STATUS
// ======================
router.patch(
  "/:id/toggle-status",
  requireRole("super_admin", "company_admin"),
  siteController.toggleStatus,
);


export default router;
