import {
  Agent,
  User,
  Company,
  WorkSession,
  Site,
  Planning,
  Payment,
  Plan,
  Log,
  Op,

  sequelize,
} from "../models/index.js";

// ======================================================
// 🚀 DASHBOARD CONTROLLER
// ======================================================

export const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;

    const { companyId, role, id: userId } = user;

    console.log("USER =>", user);

    // ======================================================
    // 🔴 SUPER ADMIN DASHBOARD
    // ======================================================

    if (role === "super_admin") {
      // ======================================================
      // 📅 FILTRE GLOBAL (day | week | month)
      // ======================================================

      const period = req.query.period || "day";

      const now = new Date();
      let dateFilter = {};
      let groupBy = sequelize.fn("DATE", sequelize.col("created_at"));

      if (period === "day") {
        dateFilter = {
          created_at: {
            [Op.gte]: new Date(now.setHours(0, 0, 0, 0)),
          },
        };
      }

      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        dateFilter = {
          created_at: {
            [Op.gte]: weekAgo,
          },
        };
      }

      if (period === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        dateFilter = {
          created_at: {
            [Op.gte]: monthAgo,
          },
        };
      }

      // ======================================================
      // 📊 STATS
      // ======================================================

      const totalCompanies = await Company.count({
        where: {
          ...dateFilter,
        },
      });

      const totalLogs = await Log.count({
        where: {
          ...dateFilter,
        },
      });

      const totalRevenue = await Payment.sum("amount", {
        where: {
          status: "completed",
          ...dateFilter,
        },
      });

      const totalPlans = await Plan.count({
        where: {
          isActive: true,
          ...dateFilter,
        },
      });

      // ======================================================
      // 📈 CHARTS
      // ======================================================

      const revenueByDay = await Payment.findAll({
        attributes: [
          [groupBy, "date"],
          [sequelize.fn("SUM", sequelize.col("amount")), "total"],
        ],
        where: {
          status: "completed",
          ...dateFilter,
        },
        group: [groupBy],
        order: [[groupBy, "ASC"]],
        raw: true,
      });

      const plansByStatus = await Plan.findAll({
        attributes: [
          "isActive",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          ...dateFilter,
        },
        group: ["isActive"],
        raw: true,
      });

      const logsByDay = await Log.findAll({
        attributes: [
          [groupBy, "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          ...dateFilter,
        },
        group: [groupBy],
        order: [[groupBy, "ASC"]],
        raw: true,
      });

      // ======================================================
      // 📤 RESPONSE FINAL
      // ======================================================

      return res.json({
        success: true,
        data: {
          scope: "global",
          role,
          period,

          stats: {
            totalCompanies,
            totalLogs,
            totalRevenue: totalRevenue || 0,
            totalPlans,
          },

          charts: {
            revenueByDay,
            plansByStatus,
            logsByDay,
          },
        },
      });
    }

    // ======================================================
    // 🔒 COMPANY CHECK
    // ======================================================

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Entreprise introuvable",
      });
    }

    // ======================================================
    // 🟠 COMPANY ADMIN DASHBOARD
    // ======================================================

    if (role === "company_admin") {
      // ======================================================
      // 📅 FILTRE GLOBAL (day | week | month)
      // ======================================================

      const period = req.query.period || "day";

      const now = new Date();
      let dateFilter = {};
      let groupBy = sequelize.fn("DATE", sequelize.col("created_at"));

      if (period === "day") {
        dateFilter = {
          created_at: {
            [Op.gte]: new Date(now.setHours(0, 0, 0, 0)),
          },
        };
      }

      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        dateFilter = {
          created_at: {
            [Op.gte]: weekAgo,
          },
        };
      }

      if (period === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        dateFilter = {
          created_at: {
            [Op.gte]: monthAgo,
          },
        };
      }

      // ======================================================
      // 📊 STATS (4 KPI)
      // ======================================================

      const totalAgents = await User.count({
        where: {
          companyId,
          role: "agent",
          ...dateFilter,
        },
      });

      const totalSites = await Site.count({
        where: {
          companyId,
          ...dateFilter,
        },
      });



      const activePlannings = await Planning.count({
        where: {
          companyId,
          status: "active",
          ...dateFilter,
        },
      });

      // ======================================================
      // 📈 CHARTS (4 graphiques)
      // ======================================================

      const WorkSessionsByDay = await WorkSession.findAll({
        attributes: [
          [groupBy, "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          companyId,
          ...dateFilter,
        },
        group: [groupBy],
        order: [[groupBy, "ASC"]],
        raw: true,
      });

      const PlanningsByStatus = await Planning.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          companyId,
          ...dateFilter,
        },
        group: ["status"],
        raw: true,
      });



      // ======================================================
      // 📤 RESPONSE FINAL
      // ======================================================

      return res.json({
        success: true,
        data: {
          scope: "company",
          role,
          period,

          stats: {
            totalAgents,
            totalSites,
            activePlannings,
          },

          charts: {
            WorkSessionsByDay,
            PlanningsByStatus,
          },
        },
      });
    }

    // ======================================================
    // 🟢 AGENT DASHBOARD
    // ======================================================

    if (role === "agent") {
      // ======================================================
      // 📅 FILTRE (day | week | month)
      // ======================================================

      const period = req.query.period || "day";

      let dateFilter = {};

      if (period === "day") {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        dateFilter = {
          created_at: {
            [Op.gte]: startOfDay,
          },
        };
      }

      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        dateFilter = {
          created_at: {
            [Op.gte]: weekAgo,
          },
        };
      }

      if (period === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        dateFilter = {
          created_at: {
            [Op.gte]: monthAgo,
          },
        };
      }

      // ======================================================
      // 🔍 RECUPERATION AGENT LIÉ AU USER
      // ======================================================

      const agent = await Agent.findOne({
        where: {
          userId: user.id,
        },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent introuvable",
        });
      }

      const agentId = agent.id;

      console.log("USER ID =>", user.id);
      console.log("AGENT ID =>", agentId);

      // ======================================================
      // 📊 STATS (AGENT)
      // ======================================================

      const myWorkSessions = await WorkSession.count({
        where: {
          agentId,
          ...dateFilter,
        },
      });

      const myPlannings = await Planning.count({
        where: {
          agentId,
          ...dateFilter,
        },
      });


      const activePlannings = await Planning.count({
        where: {
          agentId,
          status: "active",
          ...dateFilter,
        },
      });

      // ======================================================
      // 📈 CHARTS
      // ======================================================

      const myWorkSessionsByDay = await WorkSession.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("created_at")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          agentId,
          ...dateFilter,
        },
        group: [sequelize.fn("DATE", sequelize.col("created_at"))],
        order: [[sequelize.fn("DATE", sequelize.col("created_at")), "ASC"]],
        raw: true,
      });

      const myPlanningsStatus = await Planning.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          agentId,
          ...dateFilter,
        },
        group: ["status"],
        raw: true,
      });


      // ======================================================
      // 🧪 DEBUG
      // ======================================================

      console.log("TOTAL WorkSessionS =>", await WorkSession.count());

      console.log(
        "MY WorkSessionS =>",
        await WorkSession.count({
          where: { agentId },
        }),
      );

      console.log(
        "MY PlanningS =>",
        await Planning.count({
          where: { agentId },
        }),
      );



      // ======================================================
      // 📤 RESPONSE
      // ======================================================

      return res.json({
        success: true,
        data: {
          scope: "agent",
          role,
          period,

          stats: {
            myWorkSessions,
     
            myPlannings,
            activePlannings,
          },

          charts: {
            myWorkSessionsByDay,
            myPlanningsStatus,
     
          },
        },
      });
    }

    // ======================================================
    // ❌ ROLE NOT ALLOWED
    // ======================================================

    return res.status(403).json({
      success: false,
      message: "Rôle non autorisé",
    });
  } catch (error) {
    console.error("DASHBOARD ERROR =>", error);

    return res.status(500).json({
      success: false,
      message: "Erreur dashboard",
      error: error.message,
    });
  }
};
