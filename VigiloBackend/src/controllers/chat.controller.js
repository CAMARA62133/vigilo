import { Op } from "sequelize";
import { Conversation, Message, User } from "../models/index.js";

/* ============================================
   HELPERS
============================================ */
const isMember = (conv, userId) =>
  conv.participants?.some((p) => p.userId === userId);

const getParticipant = (conv, userId) =>
  conv.participants?.find((p) => p.userId === userId);

/* ============================================
   CREATE CONVERSATION
============================================ */
export const createConversation = async (req, res) => {
  try {
    const {
      name,
      type = "INDIVIDUEL",
      siteId = null,
      participants = [],
      initialMessage,
    } = req.body;

    const creator = req.user;

    if (!participants.length && type !== "INDIVIDUEL") {
      return res.status(400).json({ message: "Participants requis" });
    }

    const participantIds = participants.map((p) => p.userId);

    const users = await User.findAll({
      where: {
        id: participantIds,
        companyId: creator.companyId,
      },
    });

    if (users.length !== participantIds.length) {
      return res.status(400).json({ message: "Utilisateurs invalides" });
    }

    const formattedParticipants = [
      {
        userId: creator.id,
        role: "ADMIN",
        companyId: creator.companyId,
        siteId,
        joinedAt: new Date(),
        canSendMessage: true,
        canAddUsers: true,
        canRemoveUsers: true,
      },
      ...participants.map((p) => ({
        userId: p.userId,
        role: p.role || "MEMBER",
        companyId: creator.companyId,
        siteId,
        joinedAt: new Date(),
        canSendMessage: true,
        canAddUsers: false,
        canRemoveUsers: false,
      })),
    ];

    const conversation = await Conversation.create({
      name,
      type,
      siteId,
      companyId: creator.companyId,
      createdBy: creator.id,
      participants: formattedParticipants,
    });

    if (initialMessage?.trim()) {
      const message = await Message.create({
        conversationId: conversation.id,
        senderId: creator.id,
        content: initialMessage,
        type: "TEXTE",
        status: "ENVOYÉ",
        readBy: [creator.id],
      });

      await conversation.update({ lastMessageId: message.id });
    }

    return res.status(201).json(conversation);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ============================================
   GET USER CONVERSATIONS
============================================ */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.findAll({
      where: {
        companyId: req.user.companyId,
      },

      order: [["updatedAt", "DESC"]],
    });

    const filtered = conversations.filter((conv) => isMember(conv, userId));

    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================
   GET MESSAGES (PAGINATION)
============================================ */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const offset = (page - 1) * limit;

    const conv = await Conversation.findByPk(conversationId);

    if (!conv) {
      return res.status(404).json({
        message: "Conversation introuvable",
      });
    }

    if (!isMember(conv, req.user.id)) {
      return res.status(403).json({
        message: "Accès refusé",
      });
    }

    const messages = await Message.findAll({
      where: {
        conversationId,
        isDeleted: false,
      },

      order: [["timestamp", "DESC"]],

      limit,
      offset,

      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "fullname", "photoProfile", "role"],
        },
      ],
    });

    return res.json(messages.reverse());
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================
   SEND MESSAGE
============================================ */
export const sendMessage = async (req, res) => {
  try {
    const conv = await Conversation.findByPk(req.body.conversationId);

    if (!conv) return res.status(404).json({ message: "Introuvable" });
    if (!isMember(conv, req.user.id))
      return res.status(403).json({ message: "Non membre" });

    const message = await Message.create({
      ...req.body,
      senderId: req.user.id,
      status: "ENVOYÉ",
      readBy: [req.user.id],
    });

    await Conversation.update(
      { lastMessageId: message.id, updatedAt: new Date() },
      { where: { id: conv.id } },
    );

    /* SOCKET CLEAN (OK ICI) */
    if (req.io) {
      req.io.to(`conv_${conv.id}`).emit("new_message", message);
    }

    return res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ============================================
   MARK AS READ
============================================ */
export const markAsRead = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Introuvable" });
    }

    if (!message.readBy.includes(req.user.id)) {
      message.readBy.push(req.user.id);
      await message.save();

      if (req.io) {
        req.io.to(`conv_${message.conversationId}`).emit("message_read", {
          messageId: message.id,
          userId: req.user.id,
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
/* ============================================
   ADD PARTICIPANT
============================================ */
export const addParticipant = async (req, res) => {
  try {
    const { conversationId, userId, role = "MEMBER" } = req.body;

    const conv = await Conversation.findByPk(conversationId);

    if (!conv) {
      return res.status(404).json({
        message: "Conversation introuvable",
      });
    }

    const me = getParticipant(conv, req.user.id);

    if (!me?.canAddUsers) {
      return res.status(403).json({
        message: "Permission refusée",
      });
    }

    const user = await User.findOne({
      where: {
        id: userId,
        companyId: req.user.companyId,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable",
      });
    }

    const exists = conv.participants.some((p) => p.userId === userId);

    if (exists) {
      return res.status(400).json({
        message: "Utilisateur déjà membre",
      });
    }

    conv.participants.push({
      userId,
      role,
      companyId: req.user.companyId,
      joinedAt: new Date(),
      canSendMessage: true,
      canAddUsers: false,
      canRemoveUsers: false,
    });

    await conv.update({
      participants: conv.participants,
    });

    return res.json(conv);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================
   REMOVE PARTICIPANT
============================================ */
export const removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const conv = await Conversation.findByPk(conversationId);

    if (!conv) {
      return res.status(404).json({
        message: "Conversation introuvable",
      });
    }

    const me = getParticipant(conv, req.user.id);

    if (!me?.canRemoveUsers) {
      return res.status(403).json({
        message: "Permission refusée",
      });
    }

    const target = getParticipant(conv, userId);

    if (!target) {
      return res.status(404).json({
        message: "Utilisateur non membre",
      });
    }

    // empêcher suppression dernier admin
    const admins = conv.participants.filter((p) => p.role === "ADMIN");

    if (target.role === "ADMIN" && admins.length === 1) {
      return res.status(400).json({
        message: "Impossible de supprimer le dernier admin",
      });
    }

    const updatedParticipants = conv.participants.filter(
      (p) => p.userId !== userId,
    );

    await conv.update({
      participants: updatedParticipants,
    });

    return res.json(conv);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
