// controllers/NotificationController.js
import { Notification } from "../models/index.js";

export const notificationController = {
  /**
   * GET ALL NOTIFICATIONS
   */
  async getAll(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Non autorisé",
        });
      }

      const { isRead, type, limit = 50, page = 1 } = req.query;

      const where = { userId };

      if (isRead === "true") where.isRead = true;
      if (isRead === "false") where.isRead = false;
      if (type) where.type = type;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const notifications = await Notification.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      console.error("GET NOTIFICATIONS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur récupération notifications",
      });
    }
  },

  /**
   * MARK ONE AS READ
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user?.id;

      const notification = await Notification.findOne({
        where: {
          id: req.params.id,
          userId,
        },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification introuvable",
        });
      }

      await notification.update({ isRead: true });

      return res.json({
        success: true,
        message: "Notification marquée comme lue",
      });
    } catch (error) {
      console.error("MARK READ ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur mise à jour notification",
      });
    }
  },

  /**
   * MARK ALL AS READ
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user?.id;

      await Notification.update(
        { isRead: true },
        {
          where: {
            userId,
            isRead: false,
          },
        },
      );

      return res.json({
        success: true,
        message: "Toutes les notifications ont été marquées comme lues",
      });
    } catch (error) {
      console.error("MARK ALL READ ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur mise à jour globale",
      });
    }
  },

  /**
   * GET UNREAD COUNT
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user?.id;

      const count = await Notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error("COUNT NOTIFICATIONS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur comptage notifications",
      });
    }
  },

  /**
   * DELETE ONE NOTIFICATION
   */
  async deleteOne(req, res) {
    try {
      const userId = req.user?.id;

      const notification = await Notification.findOne({
        where: {
          id: req.params.id,
          userId,
        },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification introuvable",
        });
      }

      await notification.destroy();

      return res.json({
        success: true,
        message: "Notification supprimée avec succès",
      });
    } catch (error) {
      console.error("DELETE NOTIFICATION ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur suppression notification",
      });
    }
  },

  /**
   * DELETE ALL NOTIFICATIONS
   */
  async deleteAll(req, res) {
    try {
      const userId = req.user?.id;

      await Notification.destroy({
        where: { userId },
      });

      return res.json({
        success: true,
        message: "Toutes les notifications ont été supprimées",
      });
    } catch (error) {
      console.error("DELETE ALL NOTIFICATIONS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur suppression globale",
      });
    }
  },
};
