import express from "express";
import {
  createConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  markAsRead,
  addParticipant,
  removeParticipant,
} from "../controllers/chat.controller.js";

import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

/* =========================================
   CONVERSATIONS
========================================= */

// Créer une conversation (privée ou groupe)
router.post("/conversations", requireAuth, createConversation);

// Récupérer toutes les conversations de l'utilisateur connecté
router.get("/conversations", requireAuth, getUserConversations);

/* =========================================
   MESSAGES
========================================= */

// Récupérer les messages d'une conversation (pagination)
router.get("/conversations/:conversationId/messages", requireAuth, getMessages);

// Envoyer un message
router.post("/messages", requireAuth, sendMessage);

// Marquer un message comme lu
router.patch("/messages/:messageId/read", requireAuth, markAsRead);

/* =========================================
   PARTICIPANTS (GROUP CHAT)
========================================= */

// Ajouter un participant dans une conversation
router.post("/participants/add", requireAuth, addParticipant);

// Supprimer un participant
router.post("/participants/remove", requireAuth, removeParticipant);

export default router;
