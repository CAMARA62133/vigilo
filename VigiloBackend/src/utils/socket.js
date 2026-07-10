// backend/socket.js
import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:4001",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 CONNECTÉ:", socket.id);

    socket.on("register", ({ userId, companyId, role, agentId }) => {
      if (!userId || !companyId) return;

      socket.userId = userId;
      socket.companyId = companyId;
      socket.role = role;
      socket.agentId = agentId;

      socket.join(`user_${userId}`);
      socket.join(`company_${companyId}`);
      if (agentId) socket.join(`agent_${agentId}`);
      if (role === "company_admin" || role === "super_admin")
        socket.join(`admin_${companyId}`);
    });

    // --- CHAT : ENVOI DE MESSAGE ---
    socket.on("send_message", (data) => {
      // data doit contenir: { conversationId, text, senderId, ... }
      io.to(`conv_${data.conversationId}`).emit("new_message", data);
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket
        .to(`conv_${conversationId}`)
        .emit("typing", { userId: socket.userId, conversationId, isTyping });
    });

    socket.on("message_read", ({ conversationId, messageId }) => {
      socket.to(`conv_${conversationId}`).emit("message_read", {
        conversationId,
        messageId,
        userId: socket.userId,
      });
    });

    // --- GPS ---
    socket.on("gps_update", (data) => {
      if (!socket.agentId || !socket.companyId) return;
      const payload = {
        agentId: socket.agentId,
        ...data,
        timestamp: new Date().toISOString(),
      };
      io.to(`company_${socket.companyId}`).emit("gps_live", payload);
      io.to(`track_agent_${socket.agentId}`).emit(
        "agent_location_update",
        payload,
      );
    });

    // --- NOTIFICATIONS ---
    socket.on("notification", (data) => {
      if (!socket.companyId) return;
      const payload = { ...data, timestamp: new Date().toISOString() };
      io.to(`company_${socket.companyId}`).emit("notification", payload);
    });

    socket.on("disconnect", () => {
      console.log("🔌 DÉCONNECTÉ:", socket.id);
    });
  });

  return io;
};

export const getIO = () => io;
