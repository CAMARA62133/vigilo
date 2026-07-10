import { User, Company, Agent, Op } from "../models/index.js";
import { createToken, getCookieOptions } from "../utils/jwtUtil.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";
import { sendError } from "../utils/helperError.js";

// ==================== LOGIN ====================
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email et mot de passe requis", 400);
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "name", "accountStatus", "logo"],
        },
      ],
    });

    if (!user) {
      return sendError(res, "Compte introuvable", 401);
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return sendError(res, "Mot de passe incorrect", 401);
    }

    if (user.status === "inactive") {
      return sendError(res, "Compte désactivé", 403);
    }

    if (user.company?.accountStatus === "pending") {
      return sendError(res, "Entreprise en attente de validation", 403);
    }

    if (user.company?.accountStatus === "rejected") {
      return sendError(res, "Entreprise refusée", 403);
    }

    if (user.mustChangePassword) {
      return res.status(403).json({
        success: false,
        message: "Changement de mot de passe requis",
        requirePasswordChange: true,
        userId: user.id,
      });
    }

    await user.update({
      lastLoginAt: new Date(),
    });

    const token = createToken(user.id);

    const userSafe = user.toJSON();
    delete userSafe.password;

    res.cookie("jwt", token, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user: userSafe,
      },
    });
  } catch (error) {
    return sendError(res, "Erreur lors de la connexion", 500, error);
  }
};
// ==================== LOGOUT ====================
export const logout = async (req, res) => {
  try {
    const options = getCookieOptions();
    delete options.maxAge;

    res.clearCookie("jwt", options);

    res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    return sendError(res, "Erreur lors de la déconnexion", 500, error);
  }
};
// ==================== PROFIL ====================
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Company,
          as: "company",
          required: false,
        },
      ],
    });

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    let agentProfile = null;

    if (user.role === "agent") {
      agentProfile = await Agent.findOne({
        where: { userId: user.id },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        company: user.company,
        agentProfile,
      },
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la récupération du profil",
      500,
      error,
    );
  }
};

// ==================== UPDATE PROFIL ====================
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    const { fullname, phone, email } = req.body;

    const updateData = {
      fullname: fullname || user.fullname,
      phone: phone || user.phone,
      email: email ? email.toLowerCase() : user.email,
    };

    if (req.files?.photoProfile?.[0]) {
      updateData.photoProfile = req.files.photoProfile[0].path;
    }

    await user.update(updateData);

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({
      success: true,
      message: "Profil mis à jour",
      data: updatedUser,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la mise à jour du profil",
      500,
      error,
    );
  }
};

// ==================== CHANGE PASSWORD ====================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    const isValid = await user.validatePassword(currentPassword);

    if (!isValid) {
      return sendError(res, "Mot de passe actuel incorrect", 401);
    }

    user.password = newPassword; // hash automatique
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mot de passe mis à jour",
    });
  } catch (error) {
    return sendError(res, "Erreur change password", 500, error);
  }
};
export const forceChangePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    if (!user.mustChangePassword) {
      return sendError(res, "Changement non requis", 400);
    }

    user.password = newPassword; // hash auto
    user.mustChangePassword = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Mot de passe défini avec succès",
    });
  } catch (error) {
    return sendError(res, "Erreur force change password", 500, error);
  }
};

// ==================== FORGOT PASSWORD ====================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return sendError(res, "Email requis", 400);

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // 🔒 Sécurité : Ne pas révéler si l'email existe ou pas
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Si le compte existe, un email sera envoyé",
      });
    }

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Ici le hook va intercepter et hasher automatiquement 'resetCode' en BDD
    await user.update({
      resetPasswordCode: resetCode,
      resetPasswordExpires: expires,
      resetPasswordAttempts: 0,
    });

    const html = `
      <h2>Réinitialisation mot de passe</h2>
      <p>Votre code est : <strong>${resetCode}</strong></p>
      <p>Valable 15 minutes</p>
    `;

    await sendEmail(user.email, "Réinitialisation", html);

    res.status(200).json({
      success: true,
      message: "Code envoyé",
    });
  } catch (error) {
    return sendError(res, "Erreur forgot password", 500, error);
  }
};

// ==================== VERIFY RESET CODE ====================
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) return sendError(res, "Code invalide", 400);

    // ⛔ Expiration
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return sendError(res, "Code expiré", 400);
    }

    // ⛔ Limite de tentatives
    if (user.resetPasswordAttempts >= 5) {
      return sendError(res, "Trop de tentatives", 429);
    }

    // Comparaison du code reçu en clair avec le code hashé en BDD
    const isValid = await bcrypt.compare(code, user.resetPasswordCode);

    if (!isValid) {
      await user.increment("resetPasswordAttempts");
      return sendError(res, "Code incorrect", 400);
    }

    // ✅ Reset des tentatives si OK
    await user.update({ resetPasswordAttempts: 0 });

    res.status(200).json({
      success: true,
      message: "Code valide",
    });
  } catch (error) {
    return sendError(res, "Erreur vérification code", 500, error);
  }
};

// ==================== RESET PASSWORD ====================
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) return sendError(res, "Utilisateur introuvable", 400);

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return sendError(res, "Code expiré", 400);
    }

    // Validation du code (ou du token venant du lien) avec bcrypt
    const isValid = await bcrypt.compare(code, user.resetPasswordCode);

    if (!isValid) return sendError(res, "Code invalide", 400);

    // Mise à jour finale : le mot de passe sera hashé automatiquement par le hook
    await user.update({
      password: newPassword,
      resetPasswordCode: null,
      resetPasswordExpires: null,
      resetPasswordAttempts: 0,
      mustChangePassword: false,
    });

    res.status(200).json({
      success: true,
      message: "Mot de passe réinitialisé",
    });
  } catch (error) {
    return sendError(res, "Erreur reset password", 500, error);
  }
};

export const resendResetLink = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, "Email requis", 400);
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // 🔒 Sécurité : on ne confirme pas si l'email existe ou pas
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Si le compte existe, un nouveau lien a été envoyé.",
      });
    }

    // ⛔ Sécurité : Si le compte est suspendu ou banni, on n'envoie rien
    if (user.status === "inactive") {
      return sendError(
        res,
        "Votre compte est désactivé. Contactez le support.",
        403,
      );
    }

    // 1. Génération d'un nouveau token en clair
    const newResetToken = crypto.randomBytes(32).toString("hex");
    const newExpires = new Date(Date.now() + 60 * 60 * 1000); // Rallonge d'une heure

    // 2. Mise à jour de l'utilisateur (Le hook beforeSave va intercepter et hasher le token automatiquement)
    await user.update({
      resetPasswordCode: newResetToken,
      resetPasswordExpires: newExpires,
      resetPasswordAttempts: 0, // On remet les compteurs à zéro
    });

    // 3. Reconstruction du lien avec le token EN CLAIR
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${newResetToken}&email=${encodeURIComponent(
      user.email,
    )}`;

    // 4. Envoi de l'email adapté selon le rôle ou l'état de son compte
    try {
      let emailSubject = "Nouveau lien de réinitialisation - VIGILO";
      let emailHtml = `
        <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Bonjour ${user.fullname}</h2>
            <p>Vous avez demandé un nouveau lien pour configurer votre mot de passe (le précédent ayant expiré).</p>
            <p style="text-align: center;">
                <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#3498db;color:#fff;text-decoration:none;border-radius:5px;">
                  Définir mon mot de passe
                </a>
            </p>
            <p style="color:red; font-size: 0.9em;">Ce nouveau lien expire dans 1 heure.</p>
        </div>
      `;

      await sendEmail(user.email, emailSubject, emailHtml);
    } catch (emailErr) {
      console.error("Erreur envoi email de secours:", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Nouveau lien envoyé avec succès.",
    });
  } catch (error) {
    return sendError(res, "Erreur lors du renvoi du lien", 500, error);
  }
};
export const toggleUserActive = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    // 🔥 toggle status
    user.status = user.status === "active" ? "inactive" : "active";

    await user.save();

    res.status(200).json({
      success: true,
      message: `Utilisateur ${user.status === "active" ? "activé" : "désactivé"}`,
      data: {
        id: user.id,
        status: user.status,
      },
    });
  } catch (error) {
    return sendError(res, "Erreur toggle utilisateur", 500, error);
  }
};
