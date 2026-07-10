import {
  Planning,
  Site,
  Agent,
  User,
  WorkSession,
  Notification,
  GpsPosition,
  CheckpointPassage,
  Checkpoint,
} from "../models/index.js";

import { Op } from "sequelize";

export const planningController = {
  // ======================================================
  // CREATE PLANNING
  // ======================================================

  async create(req, res) {
    try {
      const companyId = req.user?.companyId;

      const {
        agentId,
        siteId,
        workDate,
        startTime,
        endTime,
        gpsFrequencySeconds,
        roundFrequencyMinutes,
        maxIdleMinutes,
      } = req.body;

      // ======================================================
      // VALIDATION CHAMPS
      // ======================================================
      if (!agentId || !siteId || !workDate || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Champs obligatoires manquants",
        });
      }

      // ======================================================
      // CONVERSION DATE HEURE (IMPORTANT)
      // ======================================================
      const startDateTime = new Date(`${workDate}T${startTime}`);
      let endDateTime = new Date(`${workDate}T${endTime}`);

      // 👉 gestion travail de nuit (ex: 22h → 06h)
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      // ======================================================
      // VERIFICATION AGENT + SITE
      // ======================================================
      const [agent, site] = await Promise.all([
        Agent.findOne({
          where: { id: agentId },
          include: [{ model: User, as: "user" }],
        }),
        Site.findOne({
          where: { id: siteId, companyId },
        }),
      ]);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent introuvable",
        });
      }

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Site introuvable",
        });
      }

      // ======================================================
      // AGENT ACTIF ?
      // ======================================================
      if (agent.user.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Agent inactif ou suspendu",
        });
      }

      // ======================================================
      // SITE ACTIF ?
      // ======================================================
      if (!site.isActive) {
        return res.status(400).json({
          success: false,
          message: "Site désactivé",
        });
      }

      // ======================================================
      // CONFLIT PLANNING ROBUSTE
      // ======================================================
      const overlap = await Planning.findOne({
        where: {
          agentId,
          workDate,
          status: { [Op.notIn]: ["cancelled", "missed"] },

          [Op.and]: [
            {
              startTime: { [Op.lt]: endTime },
            },
            {
              endTime: { [Op.gt]: startTime },
            },
          ],
        },
      });

      if (overlap) {
        return res.status(400).json({
          success: false,
          message: "Conflit de planning détecté",
        });
      }

      // ======================================================
      // CREATE PLANNING
      // ======================================================
      const planning = await Planning.create({
        companyId,
        agentId,
        siteId,
        workDate,
        startTime,
        endTime,

        gpsFrequencySeconds: gpsFrequencySeconds || 30,
        roundFrequencyMinutes: roundFrequencyMinutes || 60,
        maxIdleMinutes: maxIdleMinutes || 30,

        status: "pending",
      });

      // ======================================================
      // RESPONSE
      // ======================================================
      return res.status(201).json({
        success: true,
        message: "Planning créé avec succès",
        data: {
          ...planning.toJSON(),
          startDateTime,
          endDateTime,
        },
      });
    } catch (error) {
      console.error("CREATE PLANNING ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Erreur création planning",
        error: error.message,
      });
    }
  },

  // ======================================================
  // UPDATE PLANNING
  // ======================================================
  async update(req, res) {
    try {
      const companyId = req.user?.companyId;

      const planning = await Planning.findOne({
        where: { id: req.params.id, companyId },
      });

      if (!planning) {
        return res.status(404).json({
          success: false,
          message: "Planning introuvable",
        });
      }

      if (planning.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Planning déjà démarré ou terminé",
        });
      }

      const { startTime, endTime, workDate } = req.body;

      // ======================================================
      // VALIDATION TEMPS (CORRIGÉE)
      // ======================================================
      if (startTime && endTime) {
        const start = new Date(`${workDate || planning.workDate}T${startTime}`);
        let end = new Date(`${workDate || planning.workDate}T${endTime}`);

        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
      }

      const allowedFields = [
        "workDate",
        "startTime",
        "endTime",
        "gpsFrequencySeconds",
        "roundFrequencyMinutes",
        "maxIdleMinutes",
        "status",
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      await planning.update(updates);

      return res.json({
        success: true,
        message: "Planning mis à jour",
        data: planning,
      });
    } catch (error) {
      console.error("UPDATE PLANNING ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur update planning",
      });
    }
  },

  // ======================================================

  // GET ALL PLANNINGS (CORRIGÉ + FILTRES + RÔLES)
  // ======================================================
async getAll(req, res) {
  try {
    const companyId = req.user?.companyId;
    const role = req.user?.role;

    const {
      datePreset,
      startDate,
      endDate,
      agentId,
      siteId,
      status,
    } = req.query;

    const where = { companyId };

    // ======================================================
    // 🔐 SECURITY (AGENT RESTRICTION)
    // ======================================================
    if (role === "agent") {
      const agent = await Agent.findOne({
        where: { userId: req.user.id },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent introuvable",
        });
      }

      where.agentId = agent.id;
    } else {
      if (agentId) where.agentId = agentId;
    }

    if (siteId) where.siteId = siteId;
    if (status) where.status = status;

    // ======================================================
    // 📅 DATE FILTER SYSTEM
    // ======================================================
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (datePreset === "today") {
      where.workDate = formatDate(today);
    }

    if (datePreset === "week") {
      const start = new Date();
      start.setDate(today.getDate() - 7);

      where.workDate = {
        [Op.between]: [formatDate(start), formatDate(today)],
      };
    }

    if (datePreset === "month") {
      const start = new Date();
      start.setDate(today.getDate() - 30);

      where.workDate = {
        [Op.between]: [formatDate(start), formatDate(today)],
      };
    }

    if (datePreset === "custom" && startDate && endDate) {
      where.workDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    // ======================================================
    // 📦 FETCH PLANNINGS
    // ======================================================
    const plannings = await Planning.findAll({
      where,
      include: [
        {
          model: Site,
          as: "site",
        },
        {
          model: Agent,
          as: "agent",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullname", "email", "phone"],
            },
          ],
        },
      ],
      order: [
        ["workDate", "DESC"],
        ["startTime", "ASC"],
      ],
    });

    // ======================================================
    // 📊 STATS (TODAY DASHBOARD)
    // ======================================================
    const todayDate = new Date().toISOString().split("T")[0];

    const [total, active, completed, missed, pending] = await Promise.all([
      Planning.count({
        where: { companyId, workDate: todayDate },
      }),

      Planning.count({
        where: { companyId, workDate: todayDate, status: "active" },
      }),

      Planning.count({
        where: { companyId, workDate: todayDate, status: "completed" },
      }),

      Planning.count({
        where: { companyId, workDate: todayDate, status: "missed" },
      }),

      Planning.count({
        where: { companyId, workDate: todayDate, status: "pending" },
      }),
    ]);

    const completionRate =
      total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

    // ======================================================
    // RESPONSE
    // ======================================================
    return res.json({
      success: true,
      data: plannings,
      stats: {
        total,
        active,
        completed,
        missed,
        pending,
        completionRate,
      },
    });

  } catch (error) {
    console.error("GET ALL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur récupération plannings",
    });
  }
},

  // ======================================================
  // GET ONE (DETAIL COMPLET)
  // ======================================================
  // ======================================================
  // GET ONE (DETAIL COMPLET - SECURISÉ)
  // ======================================================
  async getOne(req, res) {
    try {
      const companyId = req.user?.companyId;
      const role = req.user?.role;

      const planning = await Planning.findOne({
        where: { id: req.params.id, companyId },
        include: [
          {
            model: Site,
            as: "site",
            where: { companyId }, // 🔐 sécurité renforcée
          },
          {
            model: Agent,
            as: "agent",
            include: [
              {
                model: User,
                as: "user",
                attributes: [
                  "id",
                  "fullname",
                  "email",
                  "phone",
                  "photoProfile",
                ],
              },
            ],
          },
          {
            model: WorkSession,
            as: "sessions",
            include: [
              {
                model: GpsPosition,
                as: "positions",
                attributes: ["id", "latitude", "longitude", "createdAt"],
              },
              {
                model: CheckpointPassage,
                as: "checkpointPassages",
                include: [
                  {
                    model: Checkpoint,
                    as: "checkpoint",
                    attributes: ["id", "name", "code", "latitude", "longitude"],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!planning) {
        return res.status(404).json({
          success: false,
          message: "Planning introuvable",
        });
      }

      // ======================================================
      // 🔐 ACCÈS AGENT (sécurité métier)
      // ======================================================
      if (role === "agent") {
        const agent = await Agent.findOne({
          where: { userId: req.user.id },
        });

        if (!agent || planning.agentId !== agent.id) {
          return res.status(403).json({
            success: false,
            message: "Accès refusé à ce planning",
          });
        }
      }

      return res.json({
        success: true,
        data: planning,
      });
    } catch (error) {
      console.error("GET ONE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur récupération planning",
      });
    }
  },



  // ======================================================
  // CANCEL
  // ======================================================
  async cancel(req, res) {
    try {
      const companyId = req.user?.companyId;

      const planning = await Planning.findOne({
        where: { id: req.params.id, companyId },
      });

      if (!planning) {
        return res.status(404).json({
          success: false,
          message: "Planning introuvable",
        });
      }

      if (planning.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Impossible d'annuler",
        });
      }

      await planning.update({
        status: "cancelled",
      });

      return res.json({
        success: true,
        message: "Planning annulé",
      });
    } catch (error) {
      console.error("CANCEL ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur annulation",
      });
    }
  },

};
