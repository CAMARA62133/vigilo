import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { createToken, getCookieOptions } from "../utils/jwtUtil.js";

// ==============================
// AUTHENTIFICATION + INACTIVITÉ
// ==============================
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Session introuvable ou expirée." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On récupère l'utilisateur depuis la base
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Utilisateur inexistant." });
    }

    // Bloqué ? (vérifier le champ status)
    if ( user.status === "inactive") {
      return res.status(403).json({
        message:
          "Votre compte est désactivé. Veuillez contacter l'administrateur.",
      });
    }

    req.user = user;

    // Prolonger le cookie pour l'inactivité
    res.cookie("jwt", createToken(user.id), getCookieOptions());

    next();
  } catch (error) {
    // Nettoyage du cookie
    const options = getCookieOptions();
    delete options.maxAge;
    res.clearCookie("jwt", options);

    const isExpired = error.name === "TokenExpiredError";
    return res.status(401).json({
      message: isExpired
        ? "Session expirée par inactivité."
        : "Session invalide.",
    });
  }
};

// ==============================
// AUTORISATION PAR RÔLE
// ==============================
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Accès refusé : permissions insuffisantes" });
    }

    next();
  };
};


