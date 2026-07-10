import { Agent, User, Company, Op, sequelize } from "../models/index.js";
import { sendError } from "../utils/helperError.js";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";

// ================= VALIDATION CONTRAT =================
const validateContract = (contractType, res) => {
  const allowed = ["CDD", "CDI", "STAGIAIRE", "VACATAIRE"];
  if (contractType && !allowed.includes(contractType)) {
    return sendError(res, "Type de contrat invalide", 400);
  }
  return null;
};

// ================= FORMAT IDENTITY CARD =================
const formatIdentityCard = (identityCard, filePath, res) => {
  let base = {
    type: "CNI",
    number: null,
    expiryDate: null,
    documentPath: null,
  };

  try {
    const parsed =
      typeof identityCard === "string"
        ? JSON.parse(identityCard)
        : identityCard || {};

    return {
      ...base,
      ...parsed,
      documentPath: filePath || parsed?.documentPath || null,
    };
  } catch (err) {
    return sendError(res, "Format identityCard invalide", 400);
  }
};

// ================= CREATE AGENT =================
export const createAgent = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone,
      hireDate,
      contractType,
      emergencyContact,
      identityCard,
    } = req.body;

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Entreprise introuvable",
      });
    }

    // ================= CONTRACT VALIDATION =================
    const validationError = validateContract(contractType, res);
    if (validationError) return validationError;

    // ================= CHECK EMAIL DUPLICATE (🔥 FIX IMPORTANT) =================
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, "Cet email est déjà utilisé", 400);
    }

    // ================= TEMP PASSWORD + RESET =================
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    const resetLink =
      `${process.env.FRONTEND_URL}/reset-password` +
      `?token=${resetToken}` +
      `&email=${encodeURIComponent(email)}`;

    // ================= FILES =================
    const photoProfile = req.files?.photoProfile?.[0]?.path || null;
    const identityDocPath = req.files?.identityDocument?.[0]?.path || null;

    // ================= SAFE PARSE =================
    const safeParse = (data) => {
      try {
        if (!data) return null;
        if (typeof data === "object") return data;
        return JSON.parse(data);
      } catch {
        return null;
      }
    };

    const emergencyContactFormatted = safeParse(emergencyContact) || {
      name: null,
      phone: null,
      relationship: null,
    };

    const identityCardFormatted = safeParse(identityCard) || {
      type: "CNI",
      number: null,
      expiryDate: null,
      documentPath: null,
    };

    if (identityDocPath) {
      identityCardFormatted.documentPath = identityDocPath;
    }

    // ================= CREATE USER =================
    const user = await User.create({
      fullname,
      email,
      phone,
      password: tempPassword,
      role: "agent",
      companyId,
      photoProfile,
      mustChangePassword: true,
      resetPasswordCode: resetToken,
      resetPasswordExpires,
      resetPasswordAttempts: 0,
    });

    // ================= CREATE AGENT =================
    const agent = await Agent.create({
      userId: user.id,
      hireDate,
      contractType,
      emergencyContact: emergencyContactFormatted,
      identityCard: identityCardFormatted,
    });

    // ================= EMAIL =================
    try {
      await sendEmail(
        email,
        "🛡️ Activation de votre compte Agent - VIGILO",
        `
        <div style="font-family:sans-serif;">
          <h2>Bienvenue ${fullname}</h2>

          <p>Votre compte agent a été créé avec succès.</p>

          <p><b>Email :</b> ${email}</p>
          <p><b>Mot de passe temporaire :</b> ${tempPassword}</p>

          <p>
            Cliquez ci-dessous pour activer votre compte :
          </p>

          <a href="${resetLink}"
             style="
               display:inline-block;
               padding:12px 20px;
               background:#28a745;
               color:#fff;
               text-decoration:none;
               border-radius:5px;
             ">
            Activer mon compte
          </a>

          <p style="color:red;">
            Ce lien expire dans 1 heure.
          </p>
        </div>
        `,
      );
    } catch (error) {
      console.error("EMAIL ERROR:", error.message);
    }

    // ================= RESPONSE SAFE =================
    const safeUser = user.toJSON();
    delete safeUser.password;
    delete safeUser.resetPasswordCode;

    return res.status(201).json({
      success: true,
      message: "Agent créé avec succès",
      data: {
        user: safeUser,
        agent,
      },
    });
  } catch (error) {
    return sendError(res, "Erreur création agent", 500, error);
  }
};
// ================= GET ALL =================
export const getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.findAll({
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
            "status",
            "companyId",
          ],
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: agents,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la récupération des agents",
      500,
      error,
    );
  }
};

// ================= GET ONE =================
export const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: ["password"] },
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!agent) {
      return sendError(res, "Agent non trouvé", 404);
    }

    res.status(200).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la récupération de l'agent",
      500,
      error,
    );
  }
};
// ================= UPDATE =================
export const updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [{ model: User, as: "user" }],
    });

    if (!agent) {
      return sendError(res, "Agent non trouvé", 404);
    }

    const validationError = validateContract(req.body.contractType, res);
    if (validationError) return validationError;

    const photoProfile = req.files?.photoProfile?.[0]?.path;

    const identityDocPath = req.files?.identityDocument?.[0]?.path || null;

    const identityCardFormatted = formatIdentityCard(
      req.body.identityCard || agent.identityCard,
      identityDocPath || agent.identityCard?.documentPath,
      res,
    );
    if (identityCardFormatted === undefined) return;

    await agent.update({
      hireDate: req.body.hireDate ?? agent.hireDate,
      contractType: req.body.contractType ?? agent.contractType,
      identityCard: identityCardFormatted,
    });

    const userData = {};

    if (req.body.fullname) userData.fullname = req.body.fullname;
    if (req.body.phone) userData.phone = req.body.phone;
    if (photoProfile) userData.photoProfile = photoProfile;

    if (Object.keys(userData).length > 0) {
      await agent.user.update(userData);
    }

    res.json({
      success: true,
      message: "Agent mis à jour",
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la mise à jour de l'agent",
      500,
      error,
    );
  }
};
