import * as expenseService from '../services/expenseService.js';
import { successResponse, errorResponse } from '../utils/response.js';

const getAll = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const result = await expenseService.getExpenses({ userId, role, filters: req.query });
    return res.json(successResponse('Expenses loaded', result.data, result.meta));
  } catch (err) {
    console.error('getAll expenses error:', err);
    return res.status(err.statusCode || 500).json(errorResponse(err.message || 'Failed to load expenses'));
  }
};

const getYears = async (_req, res) => {
  try {
    const years = await expenseService.getExpenseYears();
    return res.json(successResponse('Expense years loaded', years));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message || 'Failed to load years'));
  }
};

const getQuarterSnapshots = async (req, res) => {
  try {
    const snapshots = await expenseService.getQuarterSnapshots({
      year: req.query.year,
      quarter: req.query.quarter,
      previousOnly: req.query.previous_only === 'true',
    });
    return res.json(successResponse('Quarter snapshots loaded', snapshots));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message || 'Failed to load quarter snapshots'));
  }
};

const create = async (req, res) => {
  try {
    const { expenseType, expense_type, title, description, amount, tripRequestId, expenseDate, expense_date } = req.body;
    const result = await expenseService.createExpense({
      employeeId: req.user._id,
      expenseType: expenseType || expense_type,
      title,
      description,
      amount,
      tripRequestId,
      expenseDate: expenseDate || expense_date,
    });
    return res.status(201).json({
      success: true,
      message: 'Expense submitted',
      data: result.expense,
      warning: result.warning,
    });
  } catch (err) {
    console.error('create expense error:', err);
    return res.status(err.statusCode || 500).json(errorResponse(err.message || 'Failed to create expense'));
  }
};

const getOne = async (req, res) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    return res.json(successResponse('Expense loaded', expense));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const update = async (req, res) => {
  try {
    const { title, description, amount, expenseType, expense_type, expenseDate, expense_date } = req.body;
    const expense = await expenseService.updateExpense({
      id: req.params.id,
      userId: req.user._id,
      title,
      description,
      amount,
      expenseType: expenseType || expense_type,
      expenseDate: expenseDate || expense_date,
    });
    return res.json(successResponse('Expense updated', expense));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const toggleSettle = async (req, res) => {
  try {
    const result = await expenseService.settleExpense({ id: req.params.id, userId: req.user._id });
    return res.json(successResponse(result.action === 'EXPENSE_SETTLED' ? 'Expense settled' : 'Expense unsettled', result));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const archive = async (req, res) => {
  try {
    const expense = await expenseService.archiveExpense({
      id: req.params.id,
      userId: req.user._id,
      role: req.user.role,
      reason: req.body.reason,
    });
    return res.json(successResponse('Expense archived', expense));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const remove = async (req, res) => {
  try {
    const result = await expenseService.deleteExpense({
      id: req.params.id,
      userId: req.user._id,
      role: req.user.role,
    });
    return res.json(successResponse('Expense deleted', result));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const restore = async (req, res) => {
  try {
    const expense = await expenseService.restoreExpense(req.params.id);
    return res.json(successResponse('Expense restored', expense));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const settleMonth = async (req, res) => {
  try {
    const { employee_ids, employeeIds, month, year, note } = req.body;
    const ids = employee_ids || employeeIds || [];
    const results = await expenseService.settleMonth({
      userId: req.user._id,
      employeeIds: Array.isArray(ids) ? ids : ids.split(','),
      month,
      year,
      note,
    });
    const totalSettled = results.reduce((s, r) => s + r.count, 0);
    return res.json(successResponse(`${totalSettled} expenses settled across ${results.length} employees`, results));
  } catch (err) {
    console.error('settleMonth error:', err);
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const batchSettle = async (req, res) => {
  try {
    const { filters, targetStatus, note } = req.body;
    const result = await expenseService.batchSettle({
      userId: req.user._id,
      role: req.user.role,
      filters,
      targetStatus,
      note
    });
    return res.json(successResponse(`${result.count} expenses marked as ${targetStatus ? 'settled' : 'unsettled'}`, result));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const settlePreview = async (req, res) => {
  try {
    const preview = await expenseService.getSettlePreview(req.query);
    return res.json(successResponse('Settle preview loaded', preview));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getSummary = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const summary = await expenseService.getExpenseSummary({ userId, role, filters: req.query });
    return res.json(successResponse('Summary loaded', summary));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getPersonSummary = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const summary = await expenseService.getPersonSummary({ userId, role, filters: req.query });
    return res.json(successResponse('Person summary loaded', summary));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getSettlements = async (req, res) => {
  try {
    const { employee_ids, year, month, quarter, page, limit } = req.query;
    const employeeIds = employee_ids ? employee_ids.split(',') : [];
    const result = await expenseService.getSettlements({ employeeIds, year, month, quarter, page, limit });

    return res.json(successResponse('Settlements loaded', result.data, result.meta));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getArchived = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const result = await expenseService.getExpenses({
      userId,
      role,
      filters: { ...req.query, is_archived: 'true' }
    });
    return res.json(successResponse('Archived expenses loaded', result.data, result.meta));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getSettlementEmployees = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const data = await expenseService.getSettlementEmployeeSummary({
      userId,
      role,
      month: req.query.month,
      year: req.query.year
    });
    return res.json(successResponse('Settlement employees loaded', data));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

export const expenseController = {
  getAll, create, getOne, update, toggleSettle,
  archive, remove, restore, settleMonth, settlePreview, batchSettle,
  getSummary, getPersonSummary, getSettlements, getArchived, getSettlementEmployees,
  getYears, getQuarterSnapshots
};
