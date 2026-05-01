import { User } from '../models/User.js'
import { ExpenseRequest } from '../models/ExpenseRequest.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { LeaveBalance } from '../models/LeaveBalance.js'
import { successResponse, errorResponse } from '../utils/response.js'
import * as expenseService from '../services/expenseService.js'
import * as leaveService from '../services/leaveService.js'

const getStats = async (req, res) => {
  try {
    const { _id: userId, role } = req.user
    const { month, year, scope = 'all', trend_mode = 'monthly' } = req.query

    const now = new Date()
    const targetMonth = month ? parseInt(month) : null
    const targetYear = year ? parseInt(year) : now.getFullYear()

    const startOfYear = new Date(targetYear, 0, 1)
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999)
    const startOfPeriod = targetMonth ? new Date(targetYear, targetMonth - 1, 1) : startOfYear
    const endOfPeriod = targetMonth ? new Date(targetYear, targetMonth, 0, 23, 59, 59, 999) : endOfYear

    // Common data: monthly trend, category breakdown, recent expenses
    const [monthlyTrend, categoryBreakdown, recentExpenses, employeeLeaveBalances] = await Promise.all([
      trend_mode === 'quarterly'
        ? expenseService.getQuarterlyTrend({ userId, role, year: targetYear, scopeMode: scope })
        : expenseService.getMonthlyTrend({ userId, role, months: 6, scopeMode: scope }),
      expenseService.getCategoryBreakdown({ userId, role, month: targetMonth, year: targetYear, scopeMode: scope }),
      expenseService.getRecentExpenses({ userId, role, limit: 5, scopeMode: scope }),
      scope === 'all' && role !== 'EMPLOYEE'
        ? leaveService.getLeaveBalances({ userId, role })
        : Promise.resolve([]),
    ])

    let matchBase = { isArchived: false };
    matchBase = await expenseService.applyExpenseScope(matchBase, userId, role, 'dashboard', scope);
    const [
      totalUsers,
      totalExpenses,
      thisMonthTotal,
      unsettledTotal,
      settledTotal,
      thisMonthByCategory,
      pendingLeaves,
      topSpenders,
      leaveSummary,
      statusBreakdown
    ] = await Promise.all([
      role === 'SUPER_ADMIN' && scope !== 'me'
        ? User.countDocuments({ isActive: true }) 
        : role === 'MANAGER' && scope !== 'me'
          ? User.countDocuments({ managerId: userId, isActive: true }) 
          : 0,
      ExpenseRequest.aggregate([
        { $match: { ...matchBase, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { ...matchBase, expenseDate: { $gte: startOfPeriod, $lte: endOfPeriod } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { ...matchBase, isSettled: false, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { ...matchBase, isSettled: true, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { ...matchBase, expenseDate: { $gte: startOfPeriod, $lte: endOfPeriod } } },
        { $group: { _id: '$expenseType', total: { $sum: { $toDouble: '$amount' } } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ]),
      (role === 'SUPER_ADMIN' && scope !== 'me')
        ? LeaveRequest.countDocuments({ status: 'pending' })
        : LeaveRequest.countDocuments({
            employeeId: role === 'MANAGER' && scope !== 'me'
              ? { $in: await User.find({ $or: [{ _id: userId }, { managerId: userId }], isActive: true }).distinct('_id') }
              : userId,
            status: 'pending'
          }),
      expenseService.getTopSpenders({ role, userId, month: targetMonth, year: targetYear, limit: 5, scopeMode: scope }),
      scope === 'me'
        ? leaveService.getLeaveBalanceInfo(userId)
        : leaveService.getLeaveBalances({ userId, role }),
      ExpenseRequest.aggregate([
        { $match: { ...matchBase, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        {
          $group: {
            _id: '$isSettled',
            total: { $sum: { $toDouble: '$amount' } },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const avgExpense = totalExpenses[0]?.count > 0
      ? Math.round(totalExpenses[0].total / totalExpenses[0].count)
      : 0;
    const leaveBalance = Array.isArray(leaveSummary)
      ? leaveSummary.reduce((acc, item) => ({
          remainingDays: (acc.remainingDays || 0) + (item.remaining_days || 0),
          usedDays: (acc.usedDays || 0) + (item.used_days || 0),
          extraLeaves: (acc.extraLeaves || 0) + (item.extra_leaves || 0),
        }), {})
      : {
          remainingDays: leaveSummary?.remaining_days || 0,
          usedDays: leaveSummary?.used_days || 0,
          extraLeaves: leaveSummary?.extra_leaves || 0,
        };

    const settled = statusBreakdown.find(s => s._id === true);
    const unsettled = statusBreakdown.find(s => s._id === false);

    return res.json(successResponse('Stats loaded', {
      kpis: {
        totalUsers,
        totalExpenses: totalExpenses[0]?.total || 0,
        totalExpenseCount: totalExpenses[0]?.count || 0,
        thisMonthTotal: thisMonthTotal[0]?.total || 0,
        thisMonthCount: thisMonthTotal[0]?.count || 0,
        unsettledTotal: unsettledTotal[0]?.total || 0,
        unsettledCount: unsettledTotal[0]?.count || 0,
        settledTotal: settledTotal[0]?.total || 0,
        settledCount: settledTotal[0]?.count || 0,
        averageExpense: avgExpense,
        topCategoryThisMonth: thisMonthByCategory[0]?._id || 'N/A',
        pendingLeaves,
        leaveRemaining: leaveBalance?.remainingDays || 0,
        leaveTotal: (leaveBalance?.remainingDays || 0) + (leaveBalance?.usedDays || 0),
        extraLeaves: leaveBalance?.extraLeaves || 0,
      },
      monthlyTrend,
      categoryBreakdown: categoryBreakdown.map(c => ({ name: c.category, value: c.total, count: c.count })),
      recentExpenses,
      topSpenders,
      trendMode: trend_mode,
      employeeLeaveBalances,
      statusBreakdown: [
        { name: 'Settled', value: settled?.total || 0, count: settled?.count || 0 },
        { name: 'Unsettled', value: unsettled?.total || 0, count: unsettled?.count || 0 },
      ],
    }));
  } catch (err) {
    console.error('Dashboard error:', err)
    return res.status(500).json(errorResponse(err.message))
  }
}

const ensurePrivilegedDashboardAccess = (req) => {
  if (!['SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
    throw { statusCode: 403, message: 'Access denied' };
  }
};

const getAllStats = async (req, res) => {
  try {
    ensurePrivilegedDashboardAccess(req);
    const now = new Date();
    const targetMonth = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const targetYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const [
      ytd,
      selectedMonth,
      unsettled,
      settled,
      topCategoryAgg,
      pendingLeaves,
    ] = await Promise.all([
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, expenseDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, isSettled: false, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, isSettled: true, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, expenseDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: '$expenseType', total: { $sum: { $toDouble: '$amount' } } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ]),
      LeaveRequest.countDocuments({ status: 'pending' }),
    ]);

    const ytdTotal = ytd[0]?.total || 0;
    const ytdCount = ytd[0]?.count || 0;

    return res.json(successResponse('All stats loaded', {
      ytd: ytdTotal,
      selectedMonth: selectedMonth[0]?.total || 0,
      unsettled: unsettled[0]?.total || 0,
      settled: settled[0]?.total || 0,
      avgExpense: ytdCount > 0 ? Math.round(ytdTotal / ytdCount) : 0,
      topCategory: topCategoryAgg[0]?._id || 'N/A',
      pendingLeaves,
    }));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getAllLeave = async (req, res) => {
  try {
    ensurePrivilegedDashboardAccess(req);
    const currentYear = new Date().getFullYear();
    const employees = await User.find({ role: 'EMPLOYEE', isActive: true }).sort({ name: 1 });
    const balances = await leaveService.getLeaveBalances({ userId: req.user._id, role: 'SUPER_ADMIN' });
    const balanceMap = new Map(balances.map((balance) => [balance.user_id, balance]));

    return res.json(successResponse('All leave balances loaded', employees.map((employee) => {
      const balance = balanceMap.get(employee._id.toString());
      return {
        userId: employee._id.toString(),
        name: employee.name,
        year: currentYear,
        totalLeave: balance?.total_allowed ?? 12,
        usedLeave: balance?.used_days ?? 0,
        remainingLeave: balance?.remaining_days ?? 12,
      };
    })));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getAllExpenseTrend = async (req, res) => {
  try {
    ensurePrivilegedDashboardAccess(req);
    const now = new Date();
    const targetYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const results = await ExpenseRequest.aggregate([
      { $match: { isArchived: false, expenseDate: { $gte: startOfYear, $lte: endOfYear } } },
      {
        $group: {
          _id: { $month: '$expenseDate' },
          total: { $sum: { $toDouble: '$amount' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const data = monthNames.map((label, index) => {
      const found = results.find((item) => item._id === index + 1);
      return {
        month: label,
        total: found?.total || 0
      };
    });

    return res.json(successResponse('All expense trend loaded', data));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

export const dashboardController = { getStats, getAllStats, getAllLeave, getAllExpenseTrend }
