// controllers/CheckpointController.js
import { Checkpoint, Site } from "../models/index.js";

export const checkpointController = {
  /**
   * CREATE CHECKPOINT (Zone GPS automatique)
   */
  async create(req, res) {
    try {
      const companyId = req.user?.companyId;
      const { siteId, name, latitude, longitude, radius, order } = req.body;

      if (!siteId || !name || latitude == null || longitude == null) {
        return res.status(400).json({
          success: false,
          message: "siteId, name, latitude et longitude sont obligatoires",
        });
      }

      // Vérifier que le site appartient à l'entreprise
      const site = await Site.findOne({ where: { id: siteId, companyId } });
      if (!site) {
        return res
          .status(404)
          .json({ success: false, message: "Site introuvable" });
      }

      // Générer un code unique
      const count = await Checkpoint.count({ where: { siteId } });
      const code = `CP-${site.code}-${String(count + 1).padStart(3, "0")}`;

      const checkpoint = await Checkpoint.create({
        companyId,
        siteId,
        name,
        code,
        latitude,
        longitude,
        radius: radius || 20,
        order: order || count + 1,
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        data: checkpoint,
      });
    } catch (error) {
      console.error("CREATE CHECKPOINT ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur lors de la création" });
    }
  },

  /**
   * GET ALL CHECKPOINTS BY SITE
   */
  /**
   * GET ALL CHECKPOINTS BY SITE
   */
  async getBySite(req, res) {
    try {
      const companyId = req.user?.companyId;
      const { siteId } = req.params;

      // ✅ Vérifier que le site appartient à la company
      const site = await Site.findOne({
        where: {
          id: siteId,
          companyId,
        },
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Site introuvable",
        });
      }

      // ✅ Récupérer checkpoints
      const checkpoints = await Checkpoint.findAll({
        where: { siteId },
        order: [["order", "ASC"]],
      });

      return res.json({
        success: true,
        data: checkpoints,
      });
    } catch (error) {
      console.error("GET CHECKPOINTS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération",
      });
    }
  },

  /**
   * UPDATE CHECKPOINT
   */
  async update(req, res) {
    try {
      const { id } = req.params;

      // ✅ Vérifier uniquement par ID
      const checkpoint = await Checkpoint.findByPk(id);

      if (!checkpoint) {
        return res.status(404).json({
          success: false,
          message: "Checkpoint introuvable",
        });
      }

      // ✅ Vérifier que le site appartient à l'entreprise
      const site = await Site.findOne({
        where: {
          id: checkpoint.siteId,
          companyId: req.user.companyId,
        },
      });

      if (!site) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé",
        });
      }

      // ✅ Champs autorisés
      const allowedFields = [
        "name",
        "latitude",
        "longitude",
        "radius",
        "order",
        "isActive",
      ];

      const updates = {};

      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      // ✅ Update
      await checkpoint.update(updates);

      return res.json({
        success: true,
        message: "Checkpoint mis à jour avec succès",
        data: checkpoint,
      });
    } catch (error) {
      console.error("UPDATE CHECKPOINT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Erreur lors de la mise à jour",
        error: error.message,
      });
    }
  },

  async toggleStatus(req, res) {
    try {
      const checkpoint = await Checkpoint.findByPk(req.params.id);

      if (!checkpoint) {
        return res.status(404).json({
          success: false,
          message: "Checkpoint introuvable",
        });
      }

      const site = await Site.findOne({
        where: {
          id: checkpoint.siteId,
          companyId: req.user.companyId,
        },
      });

      if (!site) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé",
        });
      }

      await checkpoint.update({
        isActive: !checkpoint.isActive,
      });

      return res.json({
        success: true,
        message: `Checkpoint ${
          checkpoint.isActive ? "activé" : "désactivé"
        } avec succès`,
        data: checkpoint,
      });
    } catch (error) {
      console.error("TOGGLE CHECKPOINT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message,
      });
    }
  },
};
