// controllers/SiteController.js

import { Site, Checkpoint, Planning, Company } from "../models/index.js";
import { generateQRCode} from "../utils/qrcodeGenerator.js";
import { sendEmail } from "../utils/email.js";
/* ==========================================================
   SITE CONTROLLER - VIGILO SYSTEM (WEB GPS TRACKING)
========================================================== */

export const siteController = {
  /* ==========================================================
     1. CREATE SITE
  ========================================================== */
  /* ==========================================================
   CREATE SITE
========================================================== */

  async create(req, res) {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "companyId manquant",
        });
      }

      const { name, address, latitude, longitude, securityRadius, ownerInfo } =
        req.body;

      // ======================================================
      // VALIDATION
      // ======================================================
      if (!name || latitude == null || longitude == null) {
        return res.status(400).json({
          success: false,
          message: "name, latitude et longitude obligatoires",
        });
      }

      // ======================================================
      // CREATE SITE
      // ======================================================
      const site = await Site.create({
        companyId,
        name,
        address,
        latitude,
        longitude,
        securityRadius: securityRadius || 100,
        ownerInfo,
      });

      console.log("✅ SITE CREATED");

      // ======================================================
      // GENERATE QR CODE
      // ======================================================
      const qrPayload = {
        id: site.id,
        code: site.code,
        companyId,
      };

      const qrFile = await generateQRCode(qrPayload, "site");

      console.log("✅ QR GENERATED");

      // ======================================================
      // UPDATE SITE QR
      // ======================================================
      await site.update({
        qrCode: qrFile,
      });

      console.log("✅ SITE UPDATED");

      // refresh data
      await site.reload();

      return res.status(201).json({
        success: true,
        data: site,
      });
    } catch (error) {
      console.error("❌ CREATE SITE ERROR:");
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Erreur création site",
        error: error.message,
      });
    }
  },
  /* ==========================================================
     2. UPDATE SITE
  ========================================================== */
  async update(req, res) {
    try {
      const companyId = req.user?.companyId;

      const site = await Site.findOne({
        where: {
          id: req.params.id,
          companyId,
        },
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Site introuvable",
        });
      }

      const allowed = [
        "name",
        "address",
        "latitude",
        "longitude",
        "securityRadius",
        "ownerInfo",
      ];

      const updates = {};

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      // validation GPS
      if (
        updates.latitude !== undefined &&
        typeof updates.latitude !== "number"
      ) {
        return res.status(400).json({ message: "Latitude invalide" });
      }

      if (
        updates.longitude !== undefined &&
        typeof updates.longitude !== "number"
      ) {
        return res.status(400).json({ message: "Longitude invalide" });
      }

      // si ownerInfo change (optionnel)
      if (updates.ownerInfo) {
        if (typeof updates.ownerInfo !== "object") {
          return res.status(400).json({
            message: "ownerInfo doit être un objet",
          });
        }
      }

      await site.update(updates);

      return res.json({
        success: true,
        data: site,
      });
    } catch (error) {
      console.error("UPDATE SITE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur update site",
        error: error.message,
      });
    }
  },

  /* ==========================================================
     3. GET ALL SITES
  ========================================================== */
  async getAll(req, res) {
    try {
      const companyId = req.user?.companyId;

      const sites = await Site.findAll({
        where: { companyId },
        include: [
          {
            model: Checkpoint,
            as: "checkpoints",
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const enriched = await Promise.all(
        sites.map(async (site) => {
          const activeAgents = await Planning.count({
            where: {
              siteId: site.id,
              status: "active",
            },
          });

          return {
            ...site.toJSON(),
            activeAgents,
            checkpointCount: site.checkpoints?.length || 0,
          };
        }),
      );

      return res.json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      console.error("GET ALL SITES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur récupération sites",
        error: error.message,
      });
    }
  },

  /* ==========================================================
     4. GET ONE SITE
  ========================================================== */
  async getOne(req, res) {
    try {
      const companyId = req.user?.companyId;

      const site = await Site.findOne({
        where: {
          id: req.params.id,
          companyId,
        },
        include: [
          {
            model: Checkpoint,
            as: "checkpoints",
            required: false,
          },
        ],
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Site introuvable",
        });
      }

      const activeAgents = await Planning.count({
        where: {
          siteId: site.id,
          status: "active",
        },
      });

      return res.json({
        success: true,
        data: {
          ...site.toJSON(),
          activeAgents,
        },
      });
    } catch (error) {
      console.error("GET ONE SITE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur récupération site",
        error: error.message,
      });
    }
  },


  /* ==========================================================
   5. TOGGLE SITE STATUS
========================================================== */
  async toggleStatus(req, res) {
    try {
      const companyId = req.user?.companyId;

      const site = await Site.findOne({
        where: {
          id: req.params.id,
          companyId,
        },
        include: [
          {
            model: Company,
            as: "company",
            attributes: ["name", "email"],
          },
        ],
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Site introuvable",
        });
      }

      // ======================================================
      // TOGGLE STATUS
      // ======================================================
      site.isActive = !site.isActive;

      await site.save();

      // ======================================================
      // SEND EMAIL
      // ======================================================
      try {
        if (site.company?.email) {
          await sendEmail(
            site.company.email,

            site.isActive
              ? "🟢 Site activé - VIGILO"
              : "🔴 Site désactivé - VIGILO",

            `
          <div style="font-family:Arial;padding:20px">

            <h2 style="color:${site.isActive ? "#28a745" : "#dc3545"};">
              ${site.isActive ? "🟢 Site activé" : "🔴 Site désactivé"}
            </h2>

            <p>
              Le statut du site a été modifié avec succès.
            </p>

            <div style="
              background:#f5f5f5;
              padding:15px;
              border-radius:8px;
              margin-top:15px;
            ">
              <p><strong>Nom du site :</strong> ${site.name}</p>
              <p><strong>Code :</strong> ${site.code}</p>
              <p><strong>Adresse :</strong> ${site.address || "Non définie"}</p>
              <p>
                <strong>Statut :</strong>
                ${site.isActive ? "ACTIF" : "DÉSACTIVÉ"}
              </p>
            </div>

            <p style="margin-top:20px;">
              ${
                site.isActive
                  ? "✅ Les agents peuvent désormais accéder au site."
                  : "⛔ Les accès au site sont désormais suspendus."
              }
            </p>

            <br>

            <p>
              — Système VIGILO
            </p>

          </div>
          `,
          );

          console.log("✅ EMAIL STATUS SITE ENVOYÉ");
        }
      } catch (emailError) {
        console.error("❌ ERREUR ENVOI EMAIL:", emailError.message);
      }

      // ======================================================
      // RESPONSE
      // ======================================================
      return res.json({
        success: true,

        message: site.isActive
          ? "Site activé avec succès"
          : "Site désactivé avec succès",

        data: {
          id: site.id,
          name: site.name,
          code: site.code,
          isActive: site.isActive,
        },
      });
    } catch (error) {
      console.error("TOGGLE SITE STATUS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Erreur changement statut site",
        error: error.message,
      });
    }
  },
};
