// routes/workSessionRoutes.js
import express from "express";
import { workSessionController } from "../controllers/workSession.controller.js";
import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 GLOBAL AUTH
// ======================
router.use(requireAuth);

// ======================
// 📌 CHECK-IN (Scanner QR Code) - AGENT ONLY
// ======================
router.post(
  "/checkin",
  requireRole("agent", "company_admin"),
  workSessionController.checkIn,
);
// ======================
// 📌 ENVOYER POSITION GPS (AGENT UNIQUEMENT)
// Appelé automatiquement par intervalle depuis le frontend
// ======================
router.post(
  "/send-position",
  requireRole("agent", "company_admin"),
  workSessionController.sendPosition,
);

// ======================
// 📌 VISUALISATION TEMPS RÉEL (ADMIN UNIQUEMENT)
// Pour afficher les positions des agents actifs sur la carte du Dashboard
// ======================
router.get(
  "/live-positions",
  requireRole("super_admin", "company_admin"),
  workSessionController.getLivePositions,
);

export default router;
