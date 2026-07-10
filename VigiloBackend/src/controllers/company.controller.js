import { Company, User, sequelize, Op } from "../models/index.js";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";
import { sendError } from "../utils/helperError.js";

// ======================================================
// 📌 GET ALL COMPANIES
// ======================================================
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "users",
          required: false,
          attributes: [
            "id",
            "fullname",
            "email",
            "phone",
            "role",
            "status",
            "companyId",
            "photoProfile",
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors de la récupération des entreprises",
      500,
      error,
    );
  }
};

// ======================================================
// 📌 GET COMPANY BY ID
// ======================================================
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "users",
          required: false,
          attributes: [
            "id",
            "fullname",
            "email",
            "phone",
            "role",
            "status",
            "photoProfile",
          ],
        },
      ],
    });

    if (!company) {
      return sendError(res, "Entreprise introuvable", 404);
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    return sendError(res, "Erreur récupération entreprise", 500, error);
  }
};

// ======================================================
// 📌 CREATE COMPANY + ADMIN
// ======================================================

export const createCompany = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      name,
      email,
      phone,
      address,
      country,
      adminFullname,
      adminEmail,
      adminPhone,
      isAdminCreation,
    } = req.body;

    // =========================
    // NORMALIZE EMAILS
    // =========================
    const companyEmail = email?.toLowerCase().trim();
    const adminMail = adminEmail?.toLowerCase().trim();

    // =========================
    // FILES
    // =========================
    const logo = req.files?.logo?.[0]?.path || null;
    const rccm = req.files?.rccmDoc?.[0]?.path || null;
    const nif = req.files?.nifDoc?.[0]?.path || null;

    // =========================
    // VALIDATION
    // =========================
    if (!name || !companyEmail || !adminMail) {
      await t.rollback();

      return sendError(res, "Champs obligatoires manquants", 400);
    }

    // =========================
    // CHECK USER EXIST
    // =========================
    const existing = await User.findOne({
      where: {
        email: adminMail,
      },
    });

    if (existing) {
      await t.rollback();

      return sendError(res, "Email admin déjà utilisé", 400);
    }

    // =========================
    // DIRECT CREATION
    // =========================
    const direct = isAdminCreation === true || isAdminCreation === "true";

    // =========================
    // TEMP PASSWORD
    // =========================
    const tempPassword = direct ? crypto.randomBytes(4).toString("hex") : null;

    // =========================
    // RESET TOKEN
    // =========================
    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    // =========================
    // CREATE COMPANY
    // =========================
    const company = await Company.create(
      {
        name,
        email: companyEmail,
        phone,
        address,
        country,
        logo,

        accountStatus: direct ? "approved" : "pending",

        documents: {
          rccm,
          nif,
        },
      },
      { transaction: t },
    );

    console.log("✅ COMPANY CREATED");

    // =========================
    // CREATE ADMIN
    // =========================
    const admin = await User.create(
      {
        fullname: adminFullname,
        email: adminMail,
        phone: adminPhone,

        password: tempPassword,

        role: "company_admin",

        companyId: company.id,

        status: direct ? "active" : "inactive",

        mustChangePassword: true,

        resetPasswordCode: resetToken,

        resetPasswordExpires,

        resetPasswordAttempts: 0,
      },
      { transaction: t },
    );

    console.log("✅ ADMIN CREATED");

    // =========================
    // COMMIT
    // =========================
    await t.commit();

    console.log("✅ TRANSACTION COMMITTED");

    // =========================
    // RESET LINK
    // =========================
    const resetLink =
      `${process.env.FRONTEND_URL}/login` + // On pointe vers /login
      `?mode=changePassword` +
      `&token=${resetToken}` +
      `&email=${encodeURIComponent(admin.email)}`;

    // =========================
    // SEND EMAIL
    // =========================
    try {
      await sendEmail(
        admin.email,

        direct
          ? "Création entreprise - VIGILO"
          : "Finalisez votre compte - VIGILO",

        direct
          ? `
          <div style="font-family:sans-serif;">
            <h2>Bienvenue ${admin.fullname}</h2>

            <p>Votre compte a été créé avec succès.</p>

            <p><b>Email :</b> ${admin.email}</p>

            <p>
              <b>Mot de passe temporaire :</b>
              ${tempPassword}
            </p>

            <p>
              Cliquez ci-dessous pour définir
              votre mot de passe :
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
              Définir mon mot de passe
            </a>

            <p style="color:red;">
              Ce lien expire dans 1 heure.
            </p>
          </div>
          `
          : `
          <div style="font-family:sans-serif;">
            <h2>Bonjour ${admin.fullname}</h2>

            <p>
              Votre demande a été enregistrée.
            </p>

            <p>
              Cliquez ci-dessous pour activer
              votre compte :
            </p>

            <a href="${resetLink}"
               style="
                 display:inline-block;
                 padding:12px 20px;
                 background:#007bff;
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
    } catch (emailError) {
      console.log("❌ EMAIL ERROR:", emailError.message);
    }

    // =========================
    // SAFE RESPONSE
    // =========================
    const safeAdmin = admin.toJSON();

    delete safeAdmin.password;
    delete safeAdmin.resetPasswordCode;

    return res.status(201).json({
      success: true,

      data: {
        company,
        admin: safeAdmin,
      },
    });
  } catch (error) {
    console.log("❌ CREATE COMPANY ERROR:");
    console.log(error);

    if (!t.finished) {
      await t.rollback();
    }

    return sendError(res, "Erreur création entreprise", 500, error);
  }
};
// ======================================================
// 📌 UPDATE COMPANY
// ======================================================
export const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return sendError(res, "Entreprise introuvable", 404);
    }

    const fields = ["name", "email", "phone", "address", "country"];

    const updateData = {};

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        updateData[f] = req.body[f];
      }
    });

    if (req.files?.logo?.[0]?.path) {
      updateData.logo = req.files.logo[0].path;
    }

    const meta = company.documents || {};

    updateData.documents = {
      ...meta,
      rccm: req.files?.rccmDoc?.[0]?.path || meta.rccm,
      nif: req.files?.nifDoc?.[0]?.path || meta.nif,
    };

    await company.update(updateData);

    return res.json({
      success: true,
      message: "Entreprise mise à jour",
      data: company,
    });
  } catch (error) {
    return sendError(res, "Erreur update entreprise", 500, error);
  }
};

// ======================================================
// 📌 VALIDATE COMPANY
// ======================================================
export const validateCompany = async (req, res) => {
  try {
    const { action, motif } = req.body;
    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) return sendError(res, "Entreprise introuvable", 404);

    const admin = await User.findOne({
      where: { companyId: id, role: "company_admin" },
    });

    if (!admin) return sendError(res, "Admin introuvable", 404);

    // ❌ REJECT
    if (action === "reject") {
      await company.update({
        accountStatus: "rejected",
        rejectionReason: motif || "Non conforme",
      });

      await admin.update({ status: "inactive" });

      return res.json({ success: true, message: "Entreprise rejetée" });
    }

    // ✅ APPROVE
    if (action === "accept") {
      const tempPassword = crypto.randomBytes(4).toString("hex");

      // On génère un code à 6 chiffres aussi ici pour que ce soit compatible
      // avec le même écran de saisie, OU un token propre. Restons sur un jeton court ou 6 chiffres si tu veux simplifier.
      // Si tu préfères le lien direct, le token à 32 carac fonctionne aussi avec bcrypt.compare !
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await company.update({
        accountStatus: "approved",
        approvedAt: new Date(),
        approvedBy: req.user.id,
      });

      // Le hook interceptateur va hasher ce 'resetToken' automatiquement en BDD
      await admin.update({
        password: tempPassword,
        status: "active",
        mustChangePassword: true,
        resetPasswordCode: resetToken,
        resetPasswordExpires,
        resetPasswordAttempts: 0,
      });

      // Dans le lien, on envoie la version EN CLAIR (resetToken)
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(admin.email)}`;

      try {
        await sendEmail(
          admin.email,
          "Votre entreprise VIGILO a été validée",
          `
          <div style="font-family: sans-serif; line-height: 1.6;">
              <h2>Félicitations ${admin.fullname} !</h2>
              <p>Votre entreprise <b>${company.name}</b> est maintenant active.</p>
              <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
                  <p><b>Email :</b> ${admin.email}</p>
                  <p><b>Mot de passe temporaire :</b> <code>${tempPassword}</code></p>
                  <br>
                  <p style="text-align: center;">
                      <a href="${resetLink}" style="background: #3498db; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">
                          Définir mon mot de passe
                      </a>
                  </p>
              </div>
              <p style="font-size: 0.8em; color: #666; margin-top: 15px;">Ce lien expire dans 1 heure.</p>
          </div>
          `,
        );
      } catch (err) {
        console.error("Email error:", err.message);
      }

      return res.json({ success: true, message: "Entreprise validée" });
    }

    return sendError(res, "Action invalide", 400);
  } catch (error) {
    return sendError(res, "Erreur validation entreprise", 500, error);
  }
};
// ======================================================
// 📌 TOGGLE ACTIVE COMPANY
// ======================================================
export const toggleCompanyActive = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: ["users"],
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Entreprise introuvable",
      });
    }

    company.isActive = !company.isActive;
    await company.save();

    const admin = company.users?.[0];

    if (admin?.email) {
      try {
        await sendEmail(
          admin.email,
          "Statut entreprise modifié",
          `
          <h2>${admin.fullname}</h2>
          <p>Votre entreprise <b>${company.name}</b> est maintenant ${
            company.isActive ? "ACTIVE" : "DÉSACTIVÉE"
          }.</p>
          `,
        );
      } catch (e) {
        console.log("Email error:", e.message);
      }
    }

    return res.json({
      success: true,
      message: "Statut mis à jour",
      data: {
        id: company.id,
        isActive: company.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};
