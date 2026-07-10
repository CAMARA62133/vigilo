import express from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { requireAuth, requireRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ======================
// 🔐 GLOBAL AUTH
// ======================
router.use(requireAuth);

// ======================
// 📌 GET ALL NOTIFICATIONS
// ======================
router.get(
  "/",
  requireRole(["super_admin", "company_admin", "agent"]),
  notificationController.getAll,
);

// ======================
// 📌 UNREAD COUNT (BADGE)
// ======================
router.get(
  "/unread/count",
  requireRole(["super_admin", "company_admin", "agent"]),
  notificationController.getUnreadCount,
);

// ======================
// 📌 MARK ALL AS READ
// ⚠️ IMPORTANT: mettre avant "/:id"
// ======================
router.put(
  "/read-all",
  requireRole(["super_admin", "company_admin", "agent"]),
  notificationController.markAllAsRead,
);

// ======================
// 📌 MARK ONE AS READ
// ======================
router.put(
  "/:id/read",
  requireRole(["super_admin", "company_admin", "agent"]),
  notificationController.markAsRead,
);

// ======================
// 📌 DELETE ALL NOTIFICATIONS
// ======================
router.delete(
  "/",
  requireRole(["super_admin", "company_admin", "agent"]),
  notificationController.deleteAll,
);

// ======================
// 📌 DELETE ONE NOTIFICATION
// ======================
router.delete(
  "/:id",
  requireRole(["super_admin", "company_admin", "agent"]),
  notificationController.deleteOne,
);

export default router;
