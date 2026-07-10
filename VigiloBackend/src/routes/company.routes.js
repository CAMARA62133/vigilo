import express from "express";
import upload from "../middlewares/uploads.js";
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  validateCompany,
  toggleCompanyActive,
} from "../controllers/company.controller.js";

import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ==================== CONFIG UPLOAD ====================
const companyUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "rccmDoc", maxCount: 1 },
  { name: "nifDoc", maxCount: 1 },
  { name: "photoProfile", maxCount: 1 },
]);

// ==================== 1. ROUTES PUBLIQUES / CRÉATION ====================

// Création d'entreprise (souvent publique ou semi-publique pour l'inscription)
router.post("/", companyUpload, createCompany);

// ==================== 2. ROUTES STATIQUES (SANS :ID) ====================

// Liste de toutes les entreprises (Admin uniquement)
router.get("/", requireAuth, requireRole("super_admin"), getAllCompanies);

// ==================== 3. ROUTES D'ACTIONS SPÉCIFIQUES (AVEC :ID) ====================

/**
 * ✅ VALIDATION
 * Doit impérativement être avant /:id car c'est un chemin plus spécifique
 */
router.patch(
  "/validate/:id",
  requireAuth,
  requireRole("super_admin"),
  validateCompany,
);
router.patch(
  "/companies/:id/toggle-active",
  requireAuth,
  requireRole("super_admin"),
  toggleCompanyActive,
);


// ==================== 4. ROUTES CRUD GÉNÉRIQUES (AVEC :ID) ====================

// Récupérer par ID
router.get("/:id", requireAuth, getCompanyById);

// Mise à jour (ID en dernier)
router.patch("/:id", requireAuth, companyUpload, updateCompany);

export default router;
