// controllers/WorkSessionController.js (extrait des méthodes corrigées)
import {
  WorkSession,
  Planning,
  Site,
  GpsPosition,
  Notification,
  Agent,
  Company,
  User,
} from "../models/index.js";

import { verifyQRCode } from "../utils/qrcodeGenerator.js";
import { calculateDistance } from "../utils/geofencing.js";
import GpsTrackingService from "../services/GpsTrackingService.js";

export const workSessionController = {
  async checkIn(req, res) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id;

      if (!companyId || !userId) {
        return res.status(401).json({
          success: false,
          message: "Non authentifié",
        });
      }

      const agent = await Agent.findOne({
        where: { userId },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent introuvable",
        });
      }

      const agentId = agent.id;
      const { qrData, latitude, longitude, accuracy } = req.body;

      if (!qrData) {
        return res.status(400).json({
          success: false,
          message: "QR requis",
        });
      }

      let parsedQr;
      try {
        parsedQr = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
      } catch {
        return res.status(400).json({
          success: false,
          message: "QR invalide",
        });
      }

      if (!verifyQRCode(parsedQr)) {
        return res.status(401).json({
          success: false,
          message: "QR non valide",
        });
      }

      const { id: siteId, companyId: qrCompanyId } = parsedQr.payload;

      if (qrCompanyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: "QR non autorisé",
        });
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const localToday = `${year}-${month}-${day}`;

      const planning = await Planning.findOne({
        where: {
          agentId,
          siteId,
          workDate: localToday,
          status: "pending",
        },
        include: [{ model: Site, as: "site" }],
      });

      if (!planning) {
        return res.status(404).json({
          success: false,
          message: "Aucun planning du jour",
        });
      }

      const [h, m] = planning.startTime.split(":");
      const scheduledStart = new Date(planning.workDate);
      scheduledStart.setHours(Number(h), Number(m), 0, 0);

      const delayMinutes = (now.getTime() - scheduledStart.getTime()) / 60000;
      const maxLateMinutes = planning.maxLateMinutes || 15;

      if (delayMinutes > maxLateMinutes) {
        await planning.update({ status: "missed" });

        await Notification.create({
          userId: userId,
          title: "Retard de service",
          message: `Vous êtes en retard de ${Math.round(delayMinutes)} minutes`,
          type: "warning",
        });

        return res.status(400).json({
          success: false,
          message: "Service manqué (retard)",
        });
      }

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "GPS obligatoire",
        });
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        planning.site.latitude,
        planning.site.longitude,
      );

      if (distance > planning.site.securityRadius) {
        await Notification.create({
          userId: userId,
          title: "Hors zone",
          message: `Vous êtes à ${Math.round(distance)}m du site`,
          type: "warning",
        });

        return res.status(403).json({
          success: false,
          message: "Vous êtes hors zone autorisée",
        });
      }

      await planning.update({ status: "active" });

      const session = await WorkSession.create({
        planningId: planning.id,
        agentId,
        siteId,
        companyId: companyId, // AJOUTÉ
        status: "active",
        startedAt: now,
        startLatitude: latitude,
        startLongitude: longitude,
        lastActivityAt: now,
        totalDistanceKm: 0,
        totalCheckpointsVisited: 0,
      });

      await GpsPosition.create({
        workSessionId: session.id,
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: 0,
        isMocked: false,
      });

      return res.status(201).json({
        success: true,
        message: "Session démarrée avec succès",
        data: {
          session,
          planning,
        },
      });
    } catch (error) {
      console.error("CHECKIN ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur interne",
      });
    }
  },

  async getLivePositions(req, res) {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({
          success: false,
          message: "Non authentifié",
        });
      }

      const sessions = await WorkSession.findAll({
        where: { status: "active" },
        include: [
          {
            model: Agent,
            as: "agent",
            required: true,
            include: [
              {
                model: User,
                as: "user",
                required: true,
                where: {
                  companyId,
                },
              },
            ],
          },
          {
            model: Site,
            as: "site",
            required: true,
          },
          {
            model: Planning,
            as: "planning",
            required: true,
          },
          {
            model: GpsPosition,
            as: "positions",
            limit: 1,
            order: [["createdAt", "DESC"]],
            separate: true,
          },
        ],
      });

      const result = sessions.map((session) => {
        const lastGps = session.positions?.[0];

        return {
          id: session.id,
          agent: session.agent,
          site: session.site,
          planning: session.planning,
          status: session.status,
          lastLatitude: lastGps?.latitude || session.startLatitude,
          lastLongitude: lastGps?.longitude || session.startLongitude,
          lastActivityAt: session.lastActivityAt,
          totalDistanceKm: session.totalDistanceKm,
          totalCheckpointsVisited: session.totalCheckpointsVisited,
          startedAt: session.startedAt,
        };
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("LIVE POSITIONS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur live tracking",
        error: error.message,
      });
    }
  },

  async sendPosition(req, res) {
    try {
      const agentId = req.user?.agentProfile?.id || req.user?.agentId;

      const { latitude, longitude, accuracy, speed } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Position GPS requise",
        });
      }

      const session = await WorkSession.findOne({
        where: { agentId, status: "active" },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Aucune session active",
        });
      }

      const result = await GpsTrackingService.processPosition(
        session.id,
        agentId,
        latitude,
        longitude,
        accuracy,
        speed,
      );

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      return res.json({
        success: true,
        message: "Position traitée",
        metrics: result.metrics,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur GPS",
      });
    }
  },
};
