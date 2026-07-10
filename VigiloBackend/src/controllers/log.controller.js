import { Log, Op, sequelize } from "../models/index.js";

import { sendError } from "../utils/helperError.js";

// ==================== CREATE LOG ====================
export const createLog = async (req, res) => {
  try {
    const log = await Log.create({
      utilisateur: req.body.utilisateur,
      action: req.body.action,
      moduleAffecte: req.body.moduleAffecte || null,
      details: req.body.details || null,
      ip: req.ip || req.connection?.remoteAddress || null,
    });

    return res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    return sendError(res, "Erreur création log", 500, error);
  }
};

// ==================== GET ALL LOGS ====================
export const getAllLogs = async (req, res) => {
  try {
    const logs = await Log.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return sendError(res, "Erreur récupération logs", 500, error);
  }
};

