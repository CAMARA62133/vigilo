// =========================
// SERVER.JS OPTIMISÉ
// =========================

import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

// DB
import { sequelize } from "./src/config/db.js";
import "./src/models/index.js";

// Seed
import createDefaultAdmin from "./src/utils/seed.js";

// Services
import { startScheduler } from "./src/services/schedulerService.js";

// Routes
import authRoutes from "./src/routes/auth.routes.js";
import agentRoutes from "./src/routes/agent.routes.js";
import planRoutes from "./src/routes/plan.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import logRoutes from "./src/routes/log.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import siteRoutes from "./src/routes/site.routes.js";
import checkpointRoutes from "./src/routes/checkpoint.routes.js";
import companyRoutes from "./src/routes/company.routes.js";
import dashboardRoutes from "./src/routes/dasboard.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";

// New routes
import planningRoutes from "./src/routes/planning.routes.js";
import workSessionRoutes from "./src/routes/workSession.routes.js";
import notificationRoutes from "./src/routes/notifications.routes.js";

// Socket
import { initSocket } from "./src/utils/socket.js";

// =========================
// APP
// =========================

const app = express();
const server = http.createServer(app);

// =========================
// MIDDLEWARES
// =========================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4202",
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// =========================
// ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/users", userRoutes);
app.use("/api/checkpoints", checkpointRoutes);
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/chats", chatRoutes);

app.use("/api/plannings", planningRoutes);
app.use("/api/work-sessions", workSessionRoutes);
app.use("/api/notifications", notificationRoutes);

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Vigilo API running",
    timestamp: new Date().toISOString(),
  });
});

// =========================
// SOCKET
// =========================

const io = initSocket(server);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// =========================
// GLOBAL ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("❌ Global error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log("⏳ Connecting database...");

    await sequelize.authenticate();
    console.log("✅ DB connected");

    // Création du schéma si nécessaire
    await sequelize.query(
      `CREATE SCHEMA IF NOT EXISTS "${process.env.DB_SCHEMA || "schema_vigilo"}";`,
    );

    // Synchronisation des modèles
    await sequelize.sync();

    console.log("📦 Models synced and loaded");

    // =====================================================
    // INITIALISATION SUPER ADMIN
    // =====================================================

    const superAdmin = await sequelize.models.User.findOne({
      where: {
        role: "super_admin",
      },
    });

    if (!superAdmin) {
      await createDefaultAdmin();
    }

    // =====================================================

    startScheduler();
    console.log("⏰ Scheduler started");

    server.listen(PORT, () => {
      console.log("====================================");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment : ${process.env.NODE_ENV}`);
      console.log(`📍 API : http://localhost:${PORT}`);
      console.log("====================================");
    });
  } catch (error) {
    console.error("❌ Startup error:", error);
    process.exit(1);
  }
};

startServer();
