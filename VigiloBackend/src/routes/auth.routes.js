import express from "express";
import {
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forceChangePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  resendResetLink, 
  toggleUserActive,
} from "../controllers/auth.controller.js";

import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";
import upload from "../middlewares/uploads.js";

const router = express.Router();

// ==================== UPLOAD CONFIG ====================
const uploadFields = upload.fields([{ name: "photoProfile", maxCount: 1 }]);

// ==================== AUTH PUBLIC ====================
router.post("/login", login);
router.post("/logout", logout);

// ==================== FORGOT PASSWORD FLOW ====================
router.post("/forgot-password", forgotPassword);
router.post("/verify-code", verifyResetCode);
router.post("/reset-password", resetPassword);
router.post("/resend-reset-link", resendResetLink); 

// ==================== PASSWORD MANAGEMENT ====================

// 🔐 utilisateur connecté change son mot de passe
router.patch("/change-password", requireAuth, changePassword);

// 🔐 force change password (première connexion / mustChangePassword)
router.post("/force-change-password", forceChangePassword);

// ==================== PROFILE ====================
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, uploadFields, updateProfile);

// ==================== ADMIN ====================
router.patch(
  "/:id/toggle-active",
  requireAuth,
  requireRole("super_admin", "company_admin"),
  toggleUserActive,
);

export default router;
