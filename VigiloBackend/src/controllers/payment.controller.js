import { Payment, Company, Plan, sequelize, Op } from "../models/index.js";
import { sendError } from "../utils/helperError.js";

// ==================== GET ALL PAYMENTS ====================
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "name"],
        },
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "priceMonthly"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    return sendError(res, "Erreur récupération paiements", 500, error);
  }
};
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Company,
          as: "company",
        },
        {
          model: Plan,
          as: "plan",
        },
      ],
    });

    if (!payment) {
      return sendError(res, "Paiement introuvable", 404);
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return sendError(res, "Erreur récupération paiement", 500, error);
  }
};
export const createPayment = async (req, res) => {
  try {
    const { companyId, planId, amount, paymentMethod, currency } = req.body;

    const payment = await Payment.create({
      companyId,
      planId,
      amount,
      currency: currency || "GNF",
      paymentMethod,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Paiement créé",
      data: payment,
    });
  } catch (error) {
    return sendError(res, "Erreur création paiement", 500, error);
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { transactionReference, status } = req.body;

    const payment = await Payment.findOne({
      where: { transactionReference },
    });

    if (!payment) {
      return sendError(res, "Paiement introuvable", 404);
    }

    await payment.update({
      status: status === "success" ? "completed" : "failed",
      paidAt: status === "success" ? new Date() : null,
    });

    return res.json({
      success: true,
      message: "Paiement mis à jour",
    });
  } catch (error) {
    return sendError(res, "Erreur confirmation paiement", 500, error);
  }
};

