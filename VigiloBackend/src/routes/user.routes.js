import express from "express";
import upload from "../middlewares/uploads.js";
import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
} from "../controllers/user.controller.js";

const router = express.Router();

const uploadFields = upload.fields([{ name: "photoProfile", maxCount: 1 }]);

// ==========================
// 🔓 ROUTES PUBLIQUES (optionnel)
// ==========================
// (si tu veux garder une route publique plus tard)
// router.get("/public/companies", getEntreprises);

// ==========================
// 🔐 PROTECTION GLOBAL
// ==========================
router.use(requireAuth);

// ==========================
// 🔥 ROUTES ADMIN / ENTREPRISE
// ==========================


// CREATE USER
router.post(
  "/",
  requireRole("super_admin", "company_admin"),
  uploadFields,
  createUser,
);

// GET ALL USERS
router.get("/", requireRole("super_admin", "company_admin"), getAllUsers);

// ==========================
// 👤 USER BY ID
// ==========================
router.get("/:id", getUserById);

// UPDATE USER
router.put("/:id", requireRole("super_admin", "company_admin"), uploadFields, updateUser);

export default router;
