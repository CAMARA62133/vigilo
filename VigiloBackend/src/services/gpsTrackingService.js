// services/GpsTrackingService.js
import {
  WorkSession,
  Planning,
  Site,
  Checkpoint,
  CheckpointPassage,
  GpsPosition,
  Notification,
  Agent,
  User,
} from "../models/index.js";

import { calculateDistance } from "../utils/geofencing.js";
import { getIO } from "../utils/socket.js";
import { Op } from "sequelize";

class GpsTrackingService {
  async processPosition(
    workSessionId,
    agentId,
    latitude,
    longitude,
    accuracy,
    speed,
  ) {
    const session = await WorkSession.findOne({
      where: { id: workSessionId, status: "active" },
      include: [
        {
          model: Planning,
          as: "planning",
          include: [{ model: Site, as: "site" }],
        },
        {
          model: Agent,
          as: "agent",
          include: [{ model: User, as: "user" }],
        },
      ],
    });

    if (!session) return { error: "Session inactive" };

    const site = session.planning.site;
    const io = getIO();

    // 1. SAVE POSITION
    const position = await GpsPosition.create({
      workSessionId: session.id,
      latitude,
      longitude,
      accuracy,
      speed: speed || 0,
      isMocked: false,
    });

    // 2. PREVIOUS POSITION
    const previous = await GpsPosition.findOne({
      where: { workSessionId: session.id, id: { [Op.ne]: position.id } },
      order: [["createdAt", "DESC"]],
    });

    let distanceMoved = 0;

    if (previous) {
      distanceMoved = calculateDistance(
        previous.latitude,
        previous.longitude,
        latitude,
        longitude,
      );
    }

    const newTotalKm = (session.totalDistanceKm || 0) + distanceMoved / 1000;

    await session.update({
      lastActivityAt: new Date(),
      totalDistanceKm: newTotalKm,
      lastLatitude: latitude,
      lastLongitude: longitude,
    });

    // 3. SOCKET GPS LIVE
    io?.to(`company_${session.companyId}`).emit("gps_live", {
      agentId,
      agentName: session.agent?.user
        ? `${session.agent.user.firstName} ${session.agent.user.lastName}`
        : "Agent",
      latitude,
      longitude,
      accuracy,
      speed: speed || 0,
      workSessionId: session.id,
      siteId: site.id,
      siteName: site.name,
      distanceMoved: Math.round(distanceMoved),
      totalDistanceKm: newTotalKm,
      timestamp: new Date(),
    });

    // 4. GEOFENCE CHECK
    const distanceToSite = calculateDistance(
      latitude,
      longitude,
      site.latitude,
      site.longitude,
    );

    if (distanceToSite > site.securityRadius) {
      await Notification.create({
        userId: session.agent.userId,
        title: "Sortie zone sécurité",
        message: `Vous êtes à ${Math.round(distanceToSite)}m du site`,
        type: "warning",
      });

      io?.to(`company_${session.companyId}`).emit("alert_live", {
        type: "outside_geofence",
        agentId,
        distance: Math.round(distanceToSite),
      });
    }

    // 5. CHECKPOINTS
    const checkpoints = await Checkpoint.findAll({
      where: { siteId: site.id, isActive: true },
    });

    let newCheckpointValidated = false;

    for (const cp of checkpoints) {
      const d = calculateDistance(
        latitude,
        longitude,
        cp.latitude,
        cp.longitude,
      );

      if (d <= cp.radius) {
        const already = await CheckpointPassage.findOne({
          where: {
            workSessionId: session.id,
            checkpointId: cp.id,
          },
        });

        if (!already) {
          await CheckpointPassage.create({
            workSessionId: session.id,
            checkpointId: cp.id,
          });

          await session.increment("totalCheckpointsVisited");
          newCheckpointValidated = true;

          io?.to(`company_${session.companyId}`).emit("checkpoint_validated", {
            checkpointId: cp.id,
            name: cp.name,
            agentId,
          });
        }
      }
    }

    // 6. IDLE CHECK
    const last = session.lastActivityAt || session.startedAt;
    const idleMinutes = (Date.now() - new Date(last)) / 60000;

    if (idleMinutes > session.planning.maxIdleMinutes) {
      await Notification.create({
        userId: session.agent.userId,
        title: "Agent inactif",
        message: `Inactif depuis ${Math.floor(idleMinutes)} min`,
        type: "warning",
      });
    }

    return {
      success: true,
      metrics: {
        distanceMoved: Math.round(distanceMoved),
        idleMinutes: Math.floor(idleMinutes),
        totalCheckpointsVisited: session.totalCheckpointsVisited,
        newCheckpointValidated,
        totalDistanceKm: newTotalKm,
      },
    };
  }
}

export default new GpsTrackingService();
