// services/schedulerService.js
import cron from "node-cron";
import {
  Planning,
  WorkSession,
  Notification,
  Agent,
  User,
} from "../models/index.js";
import { Op } from "sequelize";
import { getIO } from "../utils/socket.js";

export const startScheduler = () => {
  // Vérification toutes les minutes
  cron.schedule("* * * * *", async () => {
    console.log("🔍 Scheduler: vérification des plannings...");

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    try {
      const io = getIO();

      // ======================================================
      // 1. TERMINER AUTOMATIQUEMENT LES SERVICES FINIS
      // ======================================================
      const planningsToClose = await Planning.findAll({
        where: {
          workDate: today,
          endTime: { [Op.lte]: currentTime },
          status: "active",
        },
        include: [
          {
            model: WorkSession,
            as: "sessions",
            where: { status: "active" },
            required: false,
          },
          {
            model: Agent,
            as: "agent",
            include: [{ model: User, as: "user" }],
          },
        ],
      });

      for (const planning of planningsToClose) {
        console.log(
          `✅ Fin planning auto: ${planning.id} - ${planning.endTime}`,
        );

        await planning.update({ status: "completed" });

        if (planning.sessions?.length) {
          for (const session of planning.sessions) {
            await session.update({
              status: "ended",
              endedAt: now,
              lastActivityAt: now,
            });

            // NOTIFICATION DE FIN DE SERVICE
            if (planning.agent?.userId) {
              await Notification.create({
                userId: planning.agent.userId,
                title: "Fin de service",
                message: `Votre service chez ${planning.site?.name || "le site"} est terminé. Bonne journée !`,
                type: "info",
              });

              // Émettre via Socket
              io?.to(`user_${planning.agent.userId}`).emit("notification", {
                title: "Fin de service",
                message: `Votre service est terminé. Bonne journée !`,
                type: "info",
              });
            }

            // Émettre pour l'admin
            io?.to(`company_${planning.companyId}`).emit("session_ended", {
              sessionId: session.id,
              agentId: planning.agentId,
              agentName: planning.agent?.user?.fullname || "Agent",
              endedAt: now,
            });
          }
        }
      }

      // ======================================================
      // 2. RAPPELS 30 MIN AVANT FIN DE SERVICE
      // ======================================================
      const thirtyMinutesLater = new Date(now.getTime() + 30 * 60000);
      const futureTime = `${String(thirtyMinutesLater.getHours()).padStart(2, "0")}:${String(
        thirtyMinutesLater.getMinutes(),
      ).padStart(2, "0")}`;

      const planningsToRemind = await Planning.findAll({
        where: {
          workDate: today,
          endTime: futureTime,
          status: "active",
        },
        include: [
          {
            model: Agent,
            as: "agent",
            include: [{ model: User, as: "user" }],
          },
        ],
      });

      for (const planning of planningsToRemind) {
        // Vérifier si déjà notifié
        const existingNotification = await Notification.findOne({
          where: {
            userId: planning.agent.userId,
            title: "Fin de service imminente",
            createdAt: { [Op.gte]: new Date(now.getTime() - 5 * 60000) },
          },
        });

        if (!existingNotification && planning.agent?.userId) {
          await Notification.create({
            userId: planning.agent.userId,
            title: "Fin de service imminente",
            message: `Votre service se termine dans 30 minutes.`,
            type: "warning",
          });

          io?.to(`user_${planning.agent.userId}`).emit("notification", {
            title: "Fin de service imminente",
            message: `Votre service se termine dans 30 minutes.`,
            type: "warning",
          });
        }
      }

      // ======================================================
      // 3. MARQUER LES PLANNINGS EN RETARD (MISSED)
      // ======================================================
      const latePlannings = await Planning.findAll({
        where: {
          workDate: today,
          startTime: { [Op.lt]: currentTime },
          status: "pending",
        },
        include: [
          {
            model: Agent,
            as: "agent",
            include: [{ model: User, as: "user" }],
          },
        ],
      });

      for (const planning of latePlannings) {
        const [h, m] = planning.startTime.split(":");
        const scheduledStart = new Date(now);
        scheduledStart.setHours(parseInt(h), parseInt(m), 0, 0);
        const delayMinutes = (now - scheduledStart) / 60000;
        const allowedDelay = planning.maxLateMinutes ?? 15;

        if (delayMinutes > allowedDelay) {
          console.log(`⚠️ Planning missed: ${planning.id}`);

          await planning.update({ status: "missed" });

          const session = await WorkSession.findOne({
            where: { planningId: planning.id, status: "active" },
          });

          if (session) {
            await session.update({
              status: "ended",
              endedAt: now,
            });
          }

          // Notification de retard
          if (planning.agent?.userId) {
            await Notification.create({
              userId: planning.agent.userId,
              title: "Service manqué",
              message: `Vous avez manqué votre service prévu à ${planning.startTime}.`,
              type: "error",
            });

            io?.to(`user_${planning.agent.userId}`).emit("notification", {
              title: "Service manqué",
              message: `Vous avez manqué votre service prévu à ${planning.startTime}.`,
              type: "error",
            });
          }
        }
      }
    } catch (error) {
      console.error("❌ SCHEDULER ERROR:", error);
    }
  });

  console.log("✅ Scheduler démarré (1 min interval)");
};

export const checkSessionExpiry = async () => {
  // Fonction utilitaire pour vérifier une session spécifique
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  const expiredSessions = await WorkSession.findAll({
    where: { status: "active" },
    include: [
      {
        model: Planning,
        as: "planning",
        where: {
          workDate: today,
          endTime: { [Op.lte]: currentTime },
        },
      },
    ],
  });

  for (const session of expiredSessions) {
    await session.update({
      status: "ended",
      endedAt: now,
    });
  }

  return expiredSessions.length;
};
