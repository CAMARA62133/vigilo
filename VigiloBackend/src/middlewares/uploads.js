import multer from "multer";
import path from "path";
import fs from "fs";

// ==============================
// 📂 Définition des dossiers de stockage
// ==============================
const dirPhotos = "public/uploads/photos";
const dirLogos = "public/uploads/logos";
const dirDocuments = "public/uploads/documents"; // Pour CV, NIF, RCCM, Agrement
const dirInvoices = "public/uploads/invoices";
const dirQRCodes = "public/uploads/qrcodes";
const dirIncidents = "public/uploads/incidents";

// Crée les dossiers s'ils n'existent pas
const allDirs = [
  dirPhotos,
  dirLogos,
  dirDocuments,
  dirInvoices,
  dirQRCodes,
  dirIncidents,
];

allDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ==============================
// 🔹 Configuration du stockage avec multer
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ✅ Rangement par "FieldName" envoyé depuis le Frontend
    switch (file.fieldname) {
      // Pour les portraits/profils
      case "photo":
      case "photoProfile":
        cb(null, dirPhotos);
        break;

      // Pour l'identité de l'entreprise
      case "logo":
        cb(null, dirLogos);
        break;

      // Pour les rapports d'incidents
      case "preuves":
      case "incidentDoc":
        cb(null, dirIncidents);
        break;

      // Pour les documents administratifs et techniques
      case "cvDoc":
      case "agrementDoc":
      case "rccmDoc":
      case "nifDoc":
      case "assuranceDoc":
        cb(null, dirDocuments);
        break;

      // Pour la facturation
      case "invoice":
        cb(null, dirInvoices);
        break;

      // Pour les badges/sites
      case "qrcode":
        cb(null, dirQRCodes);
        break;

      default:
        cb(null, "public/uploads"); // Dossier de secours
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // On nettoie le nom d'origine pour éviter les caractères spéciaux
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "_") // Remplace espaces par underscores
      .replace(/[^a-zA-Z0-9_]/g, ""); // Supprime le reste (accents, symboles)

    cb(null, `${file.fieldname}-${timestamp}-${cleanBaseName}${ext}`);
  },
});

// ==============================
// 🔹 Filtrage des fichiers acceptés
// ==============================
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpeg", ".jpg", ".png", ".pdf", ".xlsx", ".csv"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Format non supporté ! Utilisez : jpeg, jpg, png, pdf, xlsx, csv",
      ),
      false,
    );
  }
};

// ==============================
// 🔹 Instance Multer configurée
// ==============================
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10 Mo par fichier
});

export default upload;

// ==============================
// 🔹 Fonction interne : Sauvegarde PDF (Factures auto-générées)
// ==============================
export async function saveInvoicePDF(invoiceId, pdfBuffer) {
  try {
    const dir = "public/uploads/invoices";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `invoice-${invoiceId}-${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    await fs.promises.writeFile(filePath, pdfBuffer);

    // Retourne le chemin relatif pour enregistrement en BDD
    return `/uploads/invoices/${fileName}`;
  } catch (err) {
    console.error("❌ Erreur sauvegarde PDF facture :", err);
    throw err;
  }
}
