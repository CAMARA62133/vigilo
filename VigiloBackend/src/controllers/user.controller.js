import { User, Company } from "../models/index.js";
import crypto from "crypto";
import { sendError } from "../utils/helperError.js";
import { sendEmail } from "../utils/email.js";

// ==================== GET ALL USERS ====================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la récupération des utilisateurs",
      500,
      error,
    );
  }
};

// ==================== GET USER BY ID ====================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la récupération de l'utilisateur",
      500,
      error,
    );
  }
};

// ==================== CREATE USER ====================
export const createUser = async (req, res) => {
  try {
    const { fullname, email, phone, role, companyId, address } = req.body;

    // CHECK EMAIL
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return sendError(res, "Email déjà utilisé", 400);
    }

    // PHOTO PROFILE
    let photoProfile = null;
    if (req.files?.photoProfile?.[0]) {
      photoProfile = req.files.photoProfile[0].path;
    }

    // PASSWORD généré automatiquement
    const userPassword = crypto.randomBytes(6).toString("hex");

    const user = await User.create({
      fullname,
      address,
      email,
      phone,
      password: userPassword,
      role: role || "agent",
      companyId: companyId || null,
      photoProfile,
      status: "active",
      mustChangePassword: true,
    });

    const data = user.toJSON();
    delete data.password;
    // Lien simple vers la page de changement de mot de passe
    const resetLink = `${process.env.FRONTEND_URL}/login?mode=changePassword`;
    try {
      await sendEmail(
        user.email,
        "🎉 Votre entreprise VIGILO a été validée",
        `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color:#333;">
    
    <h2>Félicitations ${user.fullname} 🎉</h2>

    <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
      
      <p><b>Identifiant :</b> ${user.email}</p>

      <p>
        <b>Mot de passe temporaire :</b> 
        <code>${tempPassword}</code>
      </p>

      <br>

      <p style="text-align:center;">
        <a href="${resetLink}"
           style="background:#3498db;color:white;padding:12px 20px;
           text-decoration:none;border-radius:5px;font-weight:bold;">
          🔐 Changer mon mot de passe
        </a>
      </p>

    </div>

    <p style="font-size: 12px; color: #777; margin-top: 10px;">
      ⚠️ Vous devez vous connecter avec ces identifiants pour définir un nouveau mot de passe.
    </p>

  </div>
  `,
      );
    } catch (err) {
      console.error("Email error:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user: data,
      generatedPassword: userPassword,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la création de l'utilisateur",
      500,
      error,
    );
  }
};

// ==================== UPDATE USER ====================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return sendError(res, "Utilisateur introuvable", 404);
    }

    let photoProfile = user.photoProfile;

    if (req.files?.photoProfile?.[0]) {
      photoProfile = req.files.photoProfile[0].path;
    }

    await user.update({
      fullname: req.body.fullname ?? user.fullname,
      address: req.body.address ?? user.address,
      email: req.body.email ?? user.email,
      phone: req.body.phone ?? user.phone,
      role: req.body.role ?? user.role,
      status: req.body.status ?? user.status,
      photoProfile,
    });

    const updated = user.toJSON();
    delete updated.password;

    res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour",
      user: updated,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la mise à jour de l'utilisateur",
      500,
      error,
    );
  }
};
