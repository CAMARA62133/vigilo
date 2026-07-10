import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const SECRET = process.env.QR_SECRET_KEY;

if (!SECRET) {
  throw new Error(
    "QR_SECRET_KEY manquant dans les variables d'environnement (.env)",
  );
}

/**
 * Normalisation déterministe et stable du JSON
 * Garantit que l'ordre des clés n'altère pas la signature HMAC
 */
const stableStringify = (obj) =>
  JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {}),
  );

/**
 * Génère un QR Code sécurisé et signé pour un Site (Preuve de présence)
 * @param {Object} data - Contient au minimum { id, code, companyId }
 * @param {string} type - Le type d'entité (défaut: "site")
 * @returns {string} Le nom du fichier généré sauvegardé sur le disque
 */
export const generateQRCode = async (data, type = "site") => {
  try {
    if (!data || typeof data !== "object" || !data.id || !data.code) {
      throw new Error(
        "Données insuffisantes (id ou code manquant) pour générer le QR Code",
      );
    }

    const rootDir = path.join(process.cwd(), "public", "uploads", "qrcodes");

    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // 🔐 Payload strict pour Vigilo (Statique et infalsifiable)
    const payload = {
      id: data.id,
      code: data.code,
      companyId: data.companyId,
      type,
    };

    // 🔐 Génération de la signature HMAC crypto
    const signature = crypto
      .createHmac("sha256", SECRET)
      .update(stableStringify(payload))
      .digest("hex");

    // Contenu final encodé dans le QR Code
    const qrData = JSON.stringify({
      payload,
      signature,
    });

    // 🔒 Construction propre et sécurisée du nom de fichier
    // On utilise le code unique du site (ex: SITE-0001) pour éviter les "unknown"
    const cleanCodeName = data.code
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    const shortId = data.id.slice(0, 6);
    const fileName = `${type}-${cleanCodeName}-${shortId}.png`; // Retrait du Date.now() pour éviter de dupliquer les fichiers si on regénère le même site
    const filePath = path.join(rootDir, fileName);

    // Génération physique de l'image du QR Code
    await QRCode.toFile(filePath, qrData, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "H", // Haute tolérance aux pannes (saletés/déchirures sur le terrain)
    });

    return fileName;
  } catch (error) {
    console.error("❌ Erreur génération QR Code:", error.message);
    throw error;
  }
};

/**
 * Vérifie l'authenticité et l'intégrité d'un QR Code scanné par l'agent
 * @param {string|Object} qrData - Données brutes issues du scan QR Code
 * @returns {boolean} True si le QR Code est valide et signé par Vigilo
 */
export const verifyQRCode = (qrData) => {
  try {
    if (!qrData) return false;

    let parsed;
    if (typeof qrData === "string") {
      parsed = JSON.parse(qrData);
    } else {
      parsed = qrData;
    }

    if (!parsed.signature || !parsed.payload) {
      console.error("❌ Structure de QR Code invalide");
      return false;
    }

    const { signature, payload } = parsed;

    // Recalcul de la signature attendue à partir du payload reçu
    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(stableStringify(payload))
      .digest("hex");

    // Comparaison sécurisée à temps constant contre les attaques temporelles (Timing Attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );

    if (!isValid) {
      console.error(
        "❌ Alerte Sécurité : Tentative de scan d'un QR Code falsifié",
      );
    }

    return isValid;
  } catch (error) {
    console.error(
      "❌ Erreur lors de la vérification du QR Code:",
      error.message,
    );
    return false;
  }
};

/**
 * Supprime physiquement le fichier image du disque (Recyclage propre)
 */
export const deleteQRCodeFile = (qrPath) => {
  try {
    if (!qrPath) return;

    const fullPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "qrcodes",
      qrPath,
    );

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error(
      "❌ Erreur lors de la suppression physique du QR Code:",
      error.message,
    );
  }
};
