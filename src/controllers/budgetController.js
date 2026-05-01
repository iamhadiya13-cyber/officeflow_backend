import mongoose from 'mongoose';
import { MonthlyBudget } from '../models/MonthlyBudget.js';
import { ExpenseRequest } from '../models/ExpenseRequest.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { getQuarter } from '../utils/dateHelper.js';

// Helper: get current quarter date range
const currentQuarterRange = () => {
  const now = new Date();
  const quarter = getQuarter(now);
  const year = now.getFullYear();
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end, quarter, year };
};

// GET /budget/current — returns current quarter budget + personal usage for any role
const getCurrent = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { start, end, quarter, year } = currentQuarterRange();

    // Get active budget (most recent MonthlyBudget record)
    const budget = await MonthlyBudget.findOne().sort({ effectiveFrom: -1 });
    const monthlyAmount = budget ? parseFloat(budget.monthlyAmount.toString()) : 0;
    const quarterlyBudget = monthlyAmount * 3;

    // Get all expenses this quarter (FOOD + OTHER only, as per business rule)
    const usageResult = await ExpenseRequest.aggregate([
      {
        $match: {
          isArchived: false,
          expenseType: { $in: ['FOOD', 'OTHER'] },
          expenseDate: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, used: { $sum: { $toDouble: '$amount' } } } },
    ]);

    const used = usageResult[0]?.used || 0;
    const remaining = quarterlyBudget - used;
    const percentage = quarterlyBudget > 0 ? Math.round((used / quarterlyBudget) * 100) : 0;

    return res.json(successResponse('Budget loaded', {
      quarterly_budget: quarterlyBudget,
      monthly_budget: monthlyAmount,
      used,
      remaining,
      percentage,
      quarter,
      year,
      over_budget: remaining < 0,
      budget_set: !!budget,
    }));
  } catch (err) {
    console.error('getCurrent budget error:', err);
    return res.status(500).json(errorResponse(err.message || 'Failed to load budget'));
  }
};

// POST /budget/set — SUPER_ADMIN sets the monthly budget amount (quarterly = monthly * 3)
const setBudget = async (req, res) => {
  try {
    const { monthly_amount, monthlyAmount } = req.body;
    const amount = parseFloat(monthly_amount || monthlyAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json(errorResponse('Invalid amount'));
    }

    const record = await MonthlyBudget.create({
      monthlyAmount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)),
      effectiveFrom: new Date(),
      createdBy: req.user._id,
    });

    return res.status(201).json(successResponse('Budget set', {
      monthly_budget: amount,
      quarterly_budget: amount * 3,
      effective_from: record.effectiveFrom,
    }));
  } catch (err) {
    console.error('setBudget error:', err);
    return res.status(500).json(errorResponse(err.message || 'Failed to set budget'));
  }
};

// GET /budget/history — budget history records
const getHistory = async (req, res) => {
  try {
    const records = await MonthlyBudget.find()
      .sort({ effectiveFrom: -1 })
      .populate('createdBy', 'name')
      .limit(20);

    return res.json(successResponse('History loaded', records.map(r => ({
      id: r._id.toString(),
      monthly_amount: parseFloat(r.monthlyAmount.toString()),
      quarterly_amount: parseFloat(r.monthlyAmount.toString()) * 3,
      effective_from: r.effectiveFrom,
      created_by: r.createdBy?.name || 'System',
      created_at: r.createdAt,
    }))));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

// GET /budget/quarterly/usage — used by Budget page for all-type breakdown
const getUsage = async (req, res) => {
  try {
    const { start, end, quarter, year } = currentQuarterRange();
    const budget = await MonthlyBudget.findOne().sort({ effectiveFrom: -1 });
    const monthlyAmount = budget ? parseFloat(budget.monthlyAmount.toString()) : 0;
    const quarterlyBudget = monthlyAmount * 3;

    const usageResult = await ExpenseRequest.aggregate([
      {
        $match: {
          isArchived: false,
          expenseType: { $in: ['FOOD', 'OTHER'] },
          expenseDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$expenseType',
          used: { $sum: { $toDouble: '$amount' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const usageMap = {};
    usageResult.forEach(r => { usageMap[r._id] = r; });

    const types = ['FOOD', 'OTHER'];
    const perTypeQuarterly = quarterlyBudget / types.length;

    const result = types.map(type => {
      const used = usageMap[type]?.used || 0;
      const remaining = perTypeQuarterly - used;
      return {
        expense_type: type,
        total_budget: perTypeQuarterly,
        used,
        remaining,
        percentage: perTypeQuarterly > 0 ? Math.round((used / perTypeQuarterly) * 100) : 0,
        over_budget: remaining < 0,
        budget_set: !!budget,
        quarter,
        year,
      };
    });

    return res.json(successResponse('Usage loaded', result));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

// GET /budget/quarterly — historical list (stub for Budget page history table)
const getQuarterly = async (req, res) => {
  try {
    const records = await MonthlyBudget.find().sort({ effectiveFrom: -1 }).limit(20);
    const result = records.map((r, idx) => {
      const monthly = parseFloat(r.monthlyAmount.toString());
      const d = new Date(r.effectiveFrom);
      const q = getQuarter(d);
      return {
        id: r._id.toString(),
        expense_type: idx % 2 === 0 ? 'FOOD' : 'OTHER',
        quarter: q,
        year: d.getFullYear(),
        total_budget: monthly * 3,
        monthly_budget: monthly,
        effective_from: r.effectiveFrom,
      };
    });
    return res.json(successResponse('Quarterly budgets loaded', result));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

const getFund = async (_req, res) => res.json(successResponse('Fund', {}));
const adjustFund = async (_req, res) => res.json(successResponse('Adjusted', {}));
const getFundAdjustments = async (_req, res) => res.json(successResponse('Adjustments', []));

export const budgetController = {
  getCurrent, setBudget, getHistory,
  getUsage, getQuarterly,
  getFund, adjustFund, getFundAdjustments,
};
