import express from "express";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  confirmPayment,
} from "../controllers/payment.controller.js";

import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 PROTECTION GLOBALE
// ======================
router.use(requireAuth);



// ======================
// 📌 CREATE PAYMENT
// ======================
router.post("/", createPayment);

// ======================
// 📌 CONFIRM PAYMENT (WEBHOOK)
// ======================
router.post("/confirm", confirmPayment);

// ======================
// 📌 GET ALL PAYMENTS
// ======================
router.get("/", getAllPayments);

// ======================
// 📌 GET PAYMENT BY ID
// ======================
router.get("/:id", getPaymentById);

export default router;
