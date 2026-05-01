import mongoose from 'mongoose';
import { ExpenseRequest } from '../models/ExpenseRequest.js';
import { ExpenseSettlement } from '../models/ExpenseSettlement.js';
import { TripRequest } from '../models/TripRequest.js';
import { MonthlyBudget } from '../models/MonthlyBudget.js';
import { User } from '../models/User.js';
import { getQuarter } from '../utils/dateHelper.js';

// Helper to convert a Mongoose doc to a clean frontend-friendly object
const mapExpense = (d) => {
  // Use toObject (NOT toJSON) to preserve _id on populated docs;
  // User.toJSON removes _id and adds id, but toObject keeps _id accessible
  const raw = d.toObject ? d.toObject({ virtuals: false }) : d;
  const obj = d.toJSON ? d.toJSON() : d; // for other scalar fields
  return {
    id: obj._id?.toString?.() || obj.id,
    // Use raw._id on the nested doc before toJSON strips it, fallback to obj.employeeId.id (set by User toJSON)
    employeeId: raw.employeeId?._id?.toString?.() || obj.employeeId?.id?.toString?.() || obj.employeeId?._id?.toString?.() || (typeof obj.employeeId === 'string' ? obj.employeeId : null),
    employee_name: obj.employeeId?.name || obj.employee_name || null,
    department: obj.employeeId?.department || obj.department || null,
    expenseType: obj.expenseType,
    expense_type: obj.expenseType,
    tripRequestId: obj.tripRequestId,
    title: obj.title,
    description: obj.description || '',
    amount: obj.amount ? parseFloat(obj.amount.toString()) : 0,
    expenseDate: obj.expenseDate,
    expense_date: obj.expenseDate,
    isSettled: obj.isSettled,
    is_settled: obj.isSettled,
    settledBy: raw.settledBy?._id?.toString?.() || obj.settledBy?.id?.toString?.() || (typeof obj.settledBy === 'string' ? obj.settledBy : null),
    settled_by_name: obj.settledBy?.name || null,
    settledAt: obj.settledAt,
    settled_at: obj.settledAt,
    isArchived: obj.isArchived,
    is_archived: obj.isArchived,
    archivedBy: raw.archivedBy?._id?.toString?.() || obj.archivedBy?.id?.toString?.() || (typeof obj.archivedBy === 'string' ? obj.archivedBy : null),
    archived_by_name: obj.archivedBy?.name || null,
    archivedAt: obj.archivedAt,
    archiveReason: obj.archiveReason,
    settlementHistory: (obj.settlementHistory || []).map((h, i) => {
      const rawH = raw.settlementHistory?.[i] || {};
      return {
        ...h,
        id: h._id?.toString?.() || h.id,
        performedBy: rawH.performedBy?._id?.toString?.() || h.performedBy?.id?.toString?.() || (typeof h.performedBy === 'string' ? h.performedBy : null),
        performed_by_name: h.performedBy?.name || null,
      };
    }),
    submittedAt: obj.submittedAt,
    submitted_at: obj.submittedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    updated_at: obj.updatedAt,
  };
};

export const normalizeRole = (role) => (role || '').toUpperCase().trim();

export const isPrivilegedExpenseRole = (role) => {
  const norm = normalizeRole(role);
  return norm === 'SUPER_ADMIN' || norm === 'ADMIN';
};

export const applyExpenseScope = async (query, userId, rawRole, context = 'list', scopeMode = 'all') => {
  const role = normalizeRole(rawRole);
  const effectiveScope = scopeMode === 'me' ? 'me' : 'all';
  const uId = new mongoose.Types.ObjectId(userId);

  // SUPER_ADMIN sees everything — no restrictions
  if (role === 'SUPER_ADMIN') {
    if (effectiveScope === 'me') {
      query.employeeId = uId;
    }
    return query;
  }

  // MANAGER sees everything (all employees' expenses)
  if (role === 'MANAGER') {
    if (effectiveScope === 'me') {
      query.employeeId = uId;
    }
    return query;
  }

  // EMPLOYEE / INTERN — restrict to self when 'me', show all when 'all'
  if (effectiveScope === 'me') {
    query.employeeId = uId;
  }
  // effectiveScope === 'all': no filter — show all employees' expenses

  return query;
};

const buildFilterLogic = async (userId, role, filters) => {
  const {
    is_settled, expense_type, from, to, search,
    month, year, min_amount, max_amount,
    is_archived = 'false', employee_ids, scope
  } = filters;

  let query = { isArchived: is_archived === 'true' };

  if (employee_ids && employee_ids !== 'ALL') {
    const ids = employee_ids.split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    if (ids.length > 0) {
      query.employeeId = { $in: ids };
    }
  }

  if (is_settled === 'true' || is_settled === 'false') {
    query.isSettled = is_settled === 'true';
  }
  if (expense_type) {
    query.expenseType = expense_type;
  }

  // Date filtering — use expenseDate for user-facing filters
  if (from || to || month || year) {
    query.expenseDate = {};
    if (from) query.expenseDate.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.expenseDate.$lte = toDate;
    }

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      if (!isNaN(m) && !isNaN(y)) {
        const startOfMonth = new Date(y, m - 1, 1);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
        query.expenseDate = { $gte: startOfMonth, $lte: endOfMonth };
      }
    } else if (year && !month) {
      const y = parseInt(year);
      if (!isNaN(y)) {
        query.expenseDate = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59, 999) };
      }
    }
  }

  // Amount range filter
  if (min_amount || max_amount) {
    const amountConditions = {};
    if (min_amount) {
      const minVal = parseFloat(min_amount);
      if (!isNaN(minVal)) amountConditions.$gte = mongoose.Types.Decimal128.fromString(minVal.toFixed(2));
    }
    if (max_amount) {
      const maxVal = parseFloat(max_amount);
      if (!isNaN(maxVal)) amountConditions.$lte = mongoose.Types.Decimal128.fromString(maxVal.toFixed(2));
    }
    if (Object.keys(amountConditions).length > 0) {
      query.amount = amountConditions;
    }
  }

  if (search) {
    // Use regex for partial match instead of $text for better UX
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } }
    ];
  }

  return await applyExpenseScope(query, userId, role, 'list', scope || 'all');
};

const getExpenses = async ({ userId, role, filters }) => {
  const { page = 1, limit = 10, sort_by = 'expenseDate', sort_order = 'desc' } = filters;
  let query = await buildFilterLogic(userId, role, filters);

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = { [sort_by]: sort_order === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    ExpenseRequest.find(query)
      .populate('employeeId', 'name department')
      .populate('settledBy', 'name')
      .populate('archivedBy', 'name')
      .populate('settlementHistory.performedBy', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    ExpenseRequest.countDocuments(query)
  ]);

  return {
    data: data.map(mapExpense),
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    }
  };
};

const createExpense = async ({ employeeId, expenseType, title, description, amount, tripRequestId, expenseDate }) => {
  const expense = await ExpenseRequest.create({
    employeeId,
    expenseType,
    tripRequestId: tripRequestId || null,
    title,
    description,
    amount: mongoose.Types.Decimal128.fromString(parseFloat(amount).toFixed(2)),
    expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
  });

  const now = new Date();
  const currentQuarter = getQuarter(now);
  const currentYear = now.getFullYear();
  const startMonth = (currentQuarter - 1) * 3;
  const startOfQuarter = new Date(currentYear, startMonth, 1);
  const endOfQuarter = new Date(currentYear, startMonth + 3, 0, 23, 59, 59, 999);

  let warning = null;

  if (['FOOD', 'OTHER'].includes(expenseType)) {
    const activeBudget = await MonthlyBudget.findOne().sort({ effectiveFrom: -1 });

    if (activeBudget) {
      const monthlyAmount = activeBudget.monthlyAmount ? parseFloat(activeBudget.monthlyAmount.toString()) : 0;
      const quarterlyAmount = monthlyAmount * 3;

      const usedResult = await ExpenseRequest.aggregate([
        {
          $match: {
            isArchived: false,
            expenseType: { $in: ['FOOD', 'OTHER'] },
            expenseDate: { $gte: startOfQuarter, $lte: endOfQuarter }
          }
        },
        { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } }
      ]);

      const used = usedResult[0]?.total || 0;

      if (used > quarterlyAmount) {
        warning = { code: 'OVER_BUDGET', message: 'Quarterly budget exceeded. Expense submitted for review.' };
      }
    }
  }

  // Re-fetch with populate
  const populated = await ExpenseRequest.findById(expense._id)
    .populate('employeeId', 'name department');

  return { expense: mapExpense(populated), warning };
};

const getExpenseById = async (id) => {
  const er = await ExpenseRequest.findById(id)
    .populate('employeeId', 'name department')
    .populate('settledBy', 'name')
    .populate('archivedBy', 'name')
    .populate('settlementHistory.performedBy', 'name');

  if (!er) return null;
  return mapExpense(er);
};

const updateExpense = async ({ id, userId, title, description, amount, expenseType, expenseDate }) => {
  const existing = await ExpenseRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Expense not found' };
  if (existing.employeeId.toString() !== userId.toString()) throw { statusCode: 403, message: 'Not authorized' };
  if (existing.isSettled) throw { statusCode: 400, message: 'Can only edit unsettled expenses' };

  existing.title = title;
  existing.description = description;
  existing.amount = mongoose.Types.Decimal128.fromString(parseFloat(amount).toFixed(2));
  if (expenseType) existing.expenseType = expenseType;
  if (expenseDate) existing.expenseDate = new Date(expenseDate);

  await existing.save();

  const populated = await ExpenseRequest.findById(id)
    .populate('employeeId', 'name department')
    .populate('settledBy', 'name')
    .populate('archivedBy', 'name')
    .populate('settlementHistory.performedBy', 'name');

  return mapExpense(populated);
};

const archiveExpense = async ({ id, userId, role, reason }) => {
  const existing = await ExpenseRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Expense not found' };
  if (existing.isArchived) throw { statusCode: 400, message: 'Expense is already archived' };

  if (role === 'EMPLOYEE') {
    if (existing.employeeId.toString() !== userId.toString()) throw { statusCode: 403, message: 'Not authorized' };
    if (existing.isSettled) throw { statusCode: 400, message: 'Can only archive unsettled expenses' };
    reason = 'Cancelled by owner';
  }

  existing.isArchived = true;
  existing.archivedBy = userId;
  existing.archivedAt = new Date();
  existing.archiveReason = reason;

  await existing.save();

  return mapExpense(existing);
};

const restoreExpense = async (id) => {
  const existing = await ExpenseRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Expense not found' };
  if (!existing.isArchived) throw { statusCode: 400, message: 'Expense is not archived' };

  existing.isArchived = false;
  existing.archivedBy = null;
  existing.archivedAt = null;
  existing.archiveReason = null;

  await existing.save();

  return mapExpense(existing);
};

const settleExpense = async ({ id, userId }) => {
  const existing = await ExpenseRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Expense not found' };
  if (existing.isArchived) throw { statusCode: 400, message: 'Cannot settle archived expense' };

  const is_settled = !existing.isSettled;
  const oldStatus = existing.isSettled;

  existing.isSettled = is_settled;
  // If becoming unsettled, we keep the old `settledBy` and `settledAt` intact 
  // or we can null them out. The user wants to track "when it was settled".
  // Let's null them out if unsettled, since the history log retains the audit trail.
  existing.settledBy = is_settled ? userId : null;
  existing.settledAt = is_settled ? new Date() : null;
  existing.settlementId = is_settled ? existing.settlementId : null;

  existing.settlementHistory.push({
    action: is_settled ? 'SETTLED' : 'UNSETTLED',
    previousStatus: oldStatus,
    newStatus: is_settled,
    performedBy: userId,
    performedAt: new Date(),
    note: is_settled ? 'Manually marked as settled' : 'Manually marked as unsettled'
  });

  await existing.save();

  if (existing.tripRequestId) {
    const totalResult = await ExpenseRequest.aggregate([
      { $match: { tripRequestId: existing.tripRequestId, isSettled: true, isArchived: false } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } }
    ]);
    const actualTotal = totalResult[0]?.total || 0;

    await TripRequest.findByIdAndUpdate(existing.tripRequestId, {
      actualTotal: mongoose.Types.Decimal128.fromString(parseFloat(actualTotal).toFixed(2))
    });
  }

  const populated = await ExpenseRequest.findById(id)
    .populate('employeeId', 'name department')
    .populate('settledBy', 'name')
    .populate('archivedBy', 'name')
    .populate('settlementHistory.performedBy', 'name');

  return { expense: mapExpense(populated), action: is_settled ? 'EXPENSE_SETTLED' : 'EXPENSE_UNSETTLED' };
};

const getSettlements = async ({ employeeIds, year, month, quarter, page = 1, limit = 10 }) => {
  const query = { isSettled: true, isArchived: false };

  if (employeeIds && employeeIds.length > 0) {
    const validIds = employeeIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    if (validIds.length > 0) {
      query.employeeId = { $in: validIds };
    }
  }

  if (year || month || quarter) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    
    if (quarter) {
      const q = parseInt(quarter);
      if (!isNaN(q) && q >= 1 && q <= 4) {
        const startMonth = (q - 1) * 3; // 0 for Q1 (Jan), 3 for Q2 (Apr)
        const endMonth = startMonth + 2; // 2 for Q1 (Mar), 5 for Q2 (Jun)
        query.settledAt = {
          $gte: new Date(y, startMonth, 1),
          $lte: new Date(y, endMonth + 1, 0, 23, 59, 59, 999), 
        };
      }
    } else if (month) {
      const m = parseInt(month);
      if (!isNaN(m)) {
        query.settledAt = {
          $gte: new Date(y, m - 1, 1),
          $lte: new Date(y, m, 0, 23, 59, 59, 999),
        };
      }
    } else {
      query.settledAt = {
        $gte: new Date(y, 0, 1),
        $lte: new Date(y, 11, 31, 23, 59, 59, 999),
      };
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);


  const [data, total] = await Promise.all([
    ExpenseRequest.find(query)
      .populate('employeeId', 'name department')
      .populate('settledBy', 'name')
      .sort({ settledAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    ExpenseRequest.countDocuments(query),
  ]);

  return {
    data: data.map(d => {
      const obj = d.toJSON ? d.toJSON() : d;
      return {
        id: obj._id?.toString(),
        employee_name: obj.employeeId?.name || 'N/A',
        department: obj.employeeId?.department || '',
        title: obj.title,
        expense_type: obj.expenseType,
        amount: obj.amount ? parseFloat(obj.amount.toString()) : 0,
        expense_date: obj.expenseDate,
        settled_by_name: obj.settledBy?.name || 'System',
        settled_at: obj.settledAt,
        note: obj.settlementHistory?.length > 0
          ? obj.settlementHistory[obj.settlementHistory.length - 1].note
          : '',
      };
    }),
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};


const settleMonth = async ({ userId, employeeIds, month, year, note }) => {
  const m = parseInt(month);
  const y = parseInt(year);
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const results = [];

  for (const empId of employeeIds) {
    if (!mongoose.Types.ObjectId.isValid(empId)) continue;

    // find unsettled expenses for this employee in this month
    const expenses = await ExpenseRequest.find({
      employeeId: empId,
      isArchived: false,
      isSettled: false,
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (expenses.length === 0) continue;

    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

    // Create settlement record
    let settlement;
    try {
      settlement = await ExpenseSettlement.create({
        employeeId: empId,
        month: m,
        year: y,
        totalAmount: mongoose.Types.Decimal128.fromString(totalAmount.toFixed(2)),
        expenseCount: expenses.length,
        settledBy: userId,
        note: note || '',
      });
    } catch (err) {
      // If unique index violation, the month is already settled for this employee
      if (err.code === 11000) continue;
      throw err;
    }

    // Mark all as settled and push history
    const now = new Date();
    await ExpenseRequest.updateMany(
      { _id: { $in: expenses.map(e => e._id) } },
      {
        $set: {
          isSettled: true,
          settledBy: userId,
          settledAt: now,
          settlementId: settlement._id
        },
        $push: {
          settlementHistory: {
            action: 'SETTLED',
            previousStatus: false,
            newStatus: true,
            performedBy: userId,
            performedAt: now,
            note: note ? `Bulk settlement: ${note}` : 'Settled via monthly bulk action'
          }
        }
      }
    );

    results.push({ employeeId: empId, count: expenses.length, total: totalAmount });
  }

  return results;
};

const getSettlePreview = async ({ employeeIds, month, year }) => {
  const m = parseInt(month);
  const y = parseInt(year);
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const ids = employeeIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));

  const result = await ExpenseRequest.aggregate([
    {
      $match: {
        employeeId: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) },
        isArchived: false,
        isSettled: false,
        expenseDate: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$employeeId',
        count: { $sum: 1 },
        total: { $sum: { $toDouble: '$amount' } }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        employeeId: '$_id',
        employee_name: '$user.name',
        count: 1,
        total: 1
      }
    }
  ]);

  return result;
};

const getExpenseSummary = async ({ userId, role, filters }) => {
  const query = await buildFilterLogic(userId, role, filters);

  const result = await ExpenseRequest.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } }, count: { $sum: 1 } } }
  ]);

  if (result.length === 0) return { count: 0, total: 0 };

  return {
    count: result[0].count,
    total: result[0].total
  };
};

const getTeamTotal = async (managerId) => {
  const users = await User.find({ managerId }).select('_id');
  const userIds = users.map(u => u._id);

  const result = await ExpenseRequest.aggregate([
    { $match: { employeeId: { $in: userIds }, isArchived: false } },
    {
      $group: {
        _id: { expenseType: "$expenseType", isSettled: "$isSettled" },
        count: { $sum: 1 },
        total: { $sum: { $toDouble: "$amount" } }
      }
    },
    { $sort: { "_id.expenseType": 1 } }
  ]);

  return result.map(r => ({
    expense_type: r._id.expenseType,
    is_settled: r._id.isSettled,
    count: r.count,
    total: r.total
  }));
};

const getPersonSummary = async ({ userId, role, filters }) => {
  const matchQuery = await buildFilterLogic(userId, role, filters);

  const result = await ExpenseRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total_amount: { $sum: { $toDouble: "$amount" } },
        total_count: { $sum: 1 },
        settled_amount: {
          $sum: { $cond: [{ $eq: ["$isSettled", true] }, { $toDouble: "$amount" }, 0] }
        },
        settled_count: {
          $sum: { $cond: [{ $eq: ["$isSettled", true] }, 1, 0] }
        },
        unsettled_amount: {
          $sum: { $cond: [{ $eq: ["$isSettled", false] }, { $toDouble: "$amount" }, 0] }
        },
        unsettled_count: {
          $sum: { $cond: [{ $eq: ["$isSettled", false] }, 1, 0] }
        }
      }
    }
  ]);

  const typeResult = await ExpenseRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$expenseType",
        amount: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 }
      }
    }
  ]);

  const byType = {
    FOOD: { amount: 0, count: 0 },
    OTHER: { amount: 0, count: 0 },
    TRIP: { amount: 0, count: 0 },
  };

  typeResult.forEach(r => {
    if (byType[r._id]) {
      byType[r._id].amount = r.amount;
      byType[r._id].count = r.count;
    }
  });

  if (result.length === 0) {
    return {
      total_amount: 0, total_count: 0,
      settled_amount: 0, settled_count: 0,
      unsettled_amount: 0, unsettled_count: 0,
      by_type: byType
    };
  }

  return {
    ...result[0],
    _id: undefined,
    by_type: byType
  };
};

const getSettlementEmployeeSummary = async ({ userId, role, month, year }) => {
  const employees = await User.find(
    { isActive: true },
    'name department role'
  ).sort({ name: 1 });

  const targetMonth = parseInt(month);
  const targetYear = parseInt(year);
  const match = { isArchived: false };

  if (!Number.isNaN(targetMonth) && !Number.isNaN(targetYear)) {
    match.expenseDate = {
      $gte: new Date(targetYear, targetMonth - 1, 1),
      $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59, 999)
    };
  } else if (!Number.isNaN(targetYear)) {
    match.expenseDate = {
      $gte: new Date(targetYear, 0, 1),
      $lte: new Date(targetYear, 11, 31, 23, 59, 59, 999)
    };
  }

  const employeeIds = employees.map((employee) => employee._id);
  const expenseSummary = await ExpenseRequest.aggregate([
    {
      $match: {
        ...match,
        employeeId: { $in: employeeIds }
      }
    },
    {
      $group: {
        _id: '$employeeId',
        totalAmount: { $sum: { $toDouble: '$amount' } },
        totalCount: { $sum: 1 },
        unsettledAmount: {
          $sum: { $cond: [{ $eq: ['$isSettled', false] }, { $toDouble: '$amount' }, 0] }
        },
        unsettledCount: {
          $sum: { $cond: [{ $eq: ['$isSettled', false] }, 1, 0] }
        },
        settledCount: {
          $sum: { $cond: [{ $eq: ['$isSettled', true] }, 1, 0] }
        }
      }
    }
  ]);

  const summaryMap = new Map(expenseSummary.map((item) => [item._id.toString(), item]));

  return employees.map((employee) => {
    const summary = summaryMap.get(employee._id.toString());
    const totalCount = summary?.totalCount || 0;
    const unsettledCount = summary?.unsettledCount || 0;
    const status = totalCount === 0 ? 'no_expenses' : unsettledCount > 0 ? 'pending' : 'settled';

    return {
      employeeId: employee._id.toString(),
      employee_name: employee.name,
      department: employee.department || '',
      total_amount: summary?.totalAmount || 0,
      total_count: totalCount,
      unsettled_amount: summary?.unsettledAmount || 0,
      unsettled_count: unsettledCount,
      settled_count: summary?.settledCount || 0,
      status
    };
  });
};

const batchSettle = async ({ userId, role, filters, targetStatus, note }) => {
  const scopedFilters = { ...filters, is_settled: targetStatus ? 'false' : 'true' };
  let matchQuery = await buildFilterLogic(userId, role, scopedFilters);

  const expenses = await ExpenseRequest.find(matchQuery).select('_id');
  if (expenses.length === 0) return { count: 0 };

  const ids = expenses.map(e => e._id);
  const now = new Date();

  await ExpenseRequest.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isSettled: targetStatus,
        settledBy: targetStatus ? userId : null,
        settledAt: targetStatus ? now : null,
      },
      $push: {
        settlementHistory: {
          action: targetStatus ? 'SETTLED' : 'UNSETTLED',
          previousStatus: !targetStatus,
          newStatus: targetStatus,
          performedBy: userId,
          performedAt: now,
          note: note || `Batch action: marked as ${targetStatus ? 'settled' : 'unsettled'}`
        }
      }
    }
  );

  return { count: ids.length, totalAmount: 0 }; // totalAmount isn't strictly needed natively yet
};

// Dashboard analytics helpers
const getMonthlyTrend = async ({ userId, role, months = 6, scopeMode = 'all' }) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  let matchQuery = { isArchived: false, expenseDate: { $gte: startDate } };
  matchQuery = await applyExpenseScope(matchQuery, userId, role, 'dashboard', scopeMode);

  const result = await ExpenseRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: { $year: '$expenseDate' },
          month: { $month: '$expenseDate' }
        },
        total: { $sum: { $toDouble: '$amount' } },
        count: { $sum: 1 },
        settled: {
          $sum: { $cond: [{ $eq: ['$isSettled', true] }, { $toDouble: '$amount' }, 0] }
        },
        unsettled: {
          $sum: { $cond: [{ $eq: ['$isSettled', false] }, { $toDouble: '$amount' }, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Fill in missing months
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const filled = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const found = result.find(r => r._id.year === y && r._id.month === m);
    filled.push({
      month: monthNames[m - 1],
      year: y,
      label: `${monthNames[m - 1]} ${y}`,
      total: found?.total || 0,
      count: found?.count || 0,
      settled: found?.settled || 0,
      unsettled: found?.unsettled || 0,
    });
  }

  return filled;
};

const getQuarterlyTrend = async ({ userId, role, year, scopeMode = 'all' }) => {
  const now = new Date();
  const targetYear = year ? parseInt(year) : now.getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

  let matchQuery = {
    isArchived: false,
    expenseDate: { $gte: startDate, $lte: endDate },
    expenseType: { $in: ['FOOD', 'OTHER'] }
  };
  matchQuery = await applyExpenseScope(matchQuery, userId, role, 'dashboard', scopeMode);

  const result = await ExpenseRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: { $year: '$expenseDate' },
          quarter: { $ceil: { $divide: [{ $month: '$expenseDate' }, 3] } }
        },
        total: { $sum: { $toDouble: '$amount' } },
        count: { $sum: 1 },
        settled: {
          $sum: { $cond: [{ $eq: ['$isSettled', true] }, { $toDouble: '$amount' }, 0] }
        },
        unsettled: {
          $sum: { $cond: [{ $eq: ['$isSettled', false] }, { $toDouble: '$amount' }, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.quarter': 1 } }
  ]);

  const quarterLabels = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];

  return quarterLabels.map((label, index) => {
    const quarter = index + 1;
    const found = result.find(r => r._id.year === targetYear && r._id.quarter === quarter);
    return {
      month: label,
      quarter,
      year: targetYear,
      label: `${label} ${targetYear}`,
      total: found?.total || 0,
      count: found?.count || 0,
      settled: found?.settled || 0,
      unsettled: found?.unsettled || 0,
    };
  });
};

const getCategoryBreakdown = async ({ userId, role, month, year, scopeMode = 'all' }) => {
  const now = new Date();
  const y = year ? parseInt(year) : now.getFullYear();
  let matchQuery = { isArchived: false };

  if (month) {
    const m = parseInt(month);
    matchQuery.expenseDate = {
      $gte: new Date(y, m - 1, 1),
      $lte: new Date(y, m, 0, 23, 59, 59, 999)
    };
  } else {
    matchQuery.expenseDate = {
      $gte: new Date(y, 0, 1),
      $lte: new Date(y, 11, 31, 23, 59, 59, 999)
    };
  }

  matchQuery = await applyExpenseScope(matchQuery, userId, role, 'dashboard', scopeMode);

  const result = await ExpenseRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$expenseType',
        total: { $sum: { $toDouble: '$amount' } },
        count: { $sum: 1 },
      }
    }
  ]);

  return result.map(r => ({
    category: r._id,
    total: r.total,
    count: r.count,
  }));
};

const getRecentExpenses = async ({ userId, role, limit = 5, scopeMode = 'all' }) => {
  let matchQuery = { isArchived: false };
  matchQuery = await applyExpenseScope(matchQuery, userId, role, 'dashboard', scopeMode);

  const data = await ExpenseRequest.find(matchQuery)
    .populate('employeeId', 'name department')
    .populate('settlementHistory.performedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  return data.map(mapExpense);
};

const getTopSpenders = async ({ role, userId, month, year, limit = 5, scopeMode = 'all' }) => {
  const now = new Date();
  const y = year ? parseInt(year) : now.getFullYear();
  let matchQuery = { isArchived: false };

  if (month) {
    const m = parseInt(month);
    matchQuery.expenseDate = {
      $gte: new Date(y, m - 1, 1),
      $lte: new Date(y, m, 0, 23, 59, 59, 999)
    };
  } else {
    matchQuery.expenseDate = {
      $gte: new Date(y, 0, 1),
      $lte: new Date(y, 11, 31, 23, 59, 59, 999)
    };
  }

  matchQuery = await applyExpenseScope(matchQuery, userId, role, 'dashboard', scopeMode);

  const result = await ExpenseRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$employeeId',
        total: { $sum: { $toDouble: '$amount' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        employeeId: '$_id',
        name: '$user.name',
        department: '$user.department',
        total: 1,
        count: 1
      }
    }
  ]);

  return result;
};

export {
  getExpenses, createExpense, getExpenseById, updateExpense,
  archiveExpense, restoreExpense, settleExpense, getSettlements, settleMonth, getSettlePreview, batchSettle,
  getExpenseSummary, getTeamTotal, getPersonSummary,
  getMonthlyTrend, getQuarterlyTrend, getCategoryBreakdown, getRecentExpenses, getTopSpenders, getSettlementEmployeeSummary,
  mapExpense
};
