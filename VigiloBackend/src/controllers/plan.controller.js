import { Plan, Payment, Company ,Op , sequelize} from "../models/index.js";
import { sendError } from "../utils/helperError.js";

// ==================== GET ALL PLANS ====================
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    return sendError(res, "Erreur récupération plans", 500, error);
  }
};

// ==================== GET PUBLIC PLANS ====================
export const getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { isActive: true },
      attributes: ["id", "name", "code", "priceMonthly", "quotas", "features"],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    return sendError(res, "Erreur plans publics", 500, error);
  }
};

// ==================== GET PLAN BY ID ====================
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan) {
      return sendError(res, "Plan introuvable", 404);
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    return sendError(res, "Erreur plan", 500, error);
  }
};

// ==================== CREATE PLAN ====================
export const createPlan = async (req, res) => {
  try {
    const { name, code, priceMonthly, quotas, features } = req.body;

    const exist = await Plan.findOne({ where: { code } });
    if (exist) return sendError(res, "Code déjà utilisé", 400);

    const plan = await Plan.create({
      name,
      code,
      priceMonthly,
      quotas,
      features,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    return sendError(res, "Erreur création plan", 500, error);
  }
};

// ==================== UPDATE PLAN ====================
export const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan) return sendError(res, "Plan introuvable", 404);

    await plan.update(req.body);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    return sendError(res, "Erreur update plan", 500, error);
  }
};
// ==================== TOGGLE STATUS ====================
export const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan) {
      return sendError(res, "Plan introuvable", 404);
    }

    await plan.update({
      isActive: !plan.isActive,
    });

    res.status(200).json({
      success: true,
      message: `Plan ${plan.isActive ? "activé" : "désactivé"}`,
      data: plan,
    });
  } catch (error) {
    return sendError(
      res,
      "Erreur lors du changement de statut du plan",
      500,
      error,
    );
  }
};
