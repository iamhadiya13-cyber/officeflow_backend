import { LeaveType } from '../models/LeaveType.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { OtherLeaveRequest } from '../models/OtherLeaveRequest.js';
import { User } from '../models/User.js';

const getAnnualLeaveType = async () => {
  const annualType = await LeaveType.findOne({ name: 'Annual Leave' });
  if (!annualType) {
    throw { statusCode: 404, message: 'Annual Leave type not found' };
  }
  return annualType;
};

const getScopedUserIds = async ({ userId, role }) => {
  if (role === 'EMPLOYEE' || role === 'INTERN') {
    return [userId];
  }

  if (role === 'MANAGER') {
    const managerUsers = await User.find({ managerId: userId }).select('_id');
    return [...managerUsers.map(u => u._id), userId];
  }

  return null;
};

const mapLeaveBalance = (balance) => {
  const r = balance.toJSON();
  const defaultAllowed = r.leaveTypeId?.daysAllowed || 0;
  return {
    ...r,
    id: r._id?.toString?.() || r.id,
    user_id: r.userId?._id?.toString?.() || r.userId?.toString?.(),
    leave_type_id: r.leaveTypeId?._id?.toString?.() || r.leaveTypeId?.toString?.(),
    used_days: r.usedDays || 0,
    remaining_days: r.remainingDays || 0,
    extra_leaves: r.extraLeaves || 0,
    extra_leave_reason: r.extraLeaveReason || '',
    extra_leave_added_by: r.extraLeaveAddedBy?._id?.toString?.() || r.extraLeaveAddedBy?.toString?.() || null,
    extra_leave_added_at: r.extraLeaveAddedAt || null,
    leave_type_name: r.leaveTypeId?.name,
    days_allowed: defaultAllowed,
    employee_name: r.userId?.name,
    department: r.userId?.department,
    total_allowed: defaultAllowed + (r.extraLeaves || 0)
  };
};

const mapLeaveRequest = (request) => {
  const r = request.toJSON();
  return {
    ...r,
    id: r._id?.toString?.() || r.id,
    employee_id: r.employeeId?._id?.toString?.() || r.employeeId?.toString?.(),
    leave_type_id: r.leaveTypeId?._id?.toString?.() || r.leaveTypeId?.toString?.() || null,
    reviewed_by: r.reviewedBy?._id?.toString?.() || r.reviewedBy?.toString?.() || null,
    employee_name: r.employeeId?.name,
    department: r.employeeId?.department,
    leave_type_name: r.leaveTypeId?.name,
    reviewer_name: r.reviewedBy?.name,
    start_date: r.startDate,
    end_date: r.endDate,
    total_days: r.totalDays,
    review_note: r.reviewNote || ''
  };
};

const getLeaveTypes = async () => {
  return await LeaveType.find().sort({ name: 1 });
};

const getLeaveBalances = async ({ userId, role }) => {
  const currentYear = new Date().getFullYear();
  const annualType = await getAnnualLeaveType();
  let query = { year: currentYear, leaveTypeId: annualType._id };

  const scopedUserIds = await getScopedUserIds({ userId, role });
  if (scopedUserIds) {
    query.userId = role === 'EMPLOYEE' ? scopedUserIds[0] : { $in: scopedUserIds };
  }

  const balances = await LeaveBalance.find(query)
    .populate('leaveTypeId')
    .populate({ path: 'userId', select: 'name department managerId' })
    .sort('userId leaveTypeId');

  return balances.map(mapLeaveBalance);
};

const getLeaveBalanceInfo = async (employeeId) => {
  const currentYear = new Date().getFullYear();
  const annualType = await getAnnualLeaveType();
  const b = await LeaveBalance.findOne({ userId: employeeId, year: currentYear, leaveTypeId: annualType._id }).populate('leaveTypeId');
  if (!b) return null;
  return mapLeaveBalance(b);
};

const addExtraLeaves = async ({ employeeId, extraDays, reason, adminId }) => {
  const currentYear = new Date().getFullYear();
  const annualType = await getAnnualLeaveType();
  let balance = await LeaveBalance.findOne({ userId: employeeId, year: currentYear, leaveTypeId: annualType._id }).populate('leaveTypeId');
  
  if (!balance) {
    balance = new LeaveBalance({
      userId: employeeId,
      leaveTypeId: annualType._id,
      year: currentYear,
      usedDays: 0,
      remainingDays: annualType.daysAllowed || 12,
      extraLeaves: 0
    });
  }

  balance.extraLeaves += extraDays;
  balance.extraLeaveReason = reason;
  balance.extraLeaveAddedBy = adminId;
  balance.extraLeaveAddedAt = new Date();
  
  const totalAllowed = (balance.leaveTypeId?.daysAllowed || 0) + balance.extraLeaves;
  balance.remainingDays = totalAllowed - balance.usedDays;

  await balance.save();
};

const adjustExtraLeaves = async ({ employeeId, adjustment, reason, adminId }) => {
  const currentYear = new Date().getFullYear();
  const annualType = await getAnnualLeaveType();
  let balance = await LeaveBalance.findOne({ userId: employeeId, year: currentYear, leaveTypeId: annualType._id }).populate('leaveTypeId');
  
  if (!balance) {
    balance = new LeaveBalance({
      userId: employeeId,
      leaveTypeId: annualType._id,
      year: currentYear,
      usedDays: 0,
      remainingDays: annualType.daysAllowed || 12,
      extraLeaves: 0
    });
  }

  balance.extraLeaves += adjustment;
  balance.extraLeaveReason = reason;
  balance.extraLeaveAddedBy = adminId;
  balance.extraLeaveAddedAt = new Date();
  
  const totalAllowed = (balance.leaveTypeId?.daysAllowed || 0) + balance.extraLeaves;
  balance.remainingDays = totalAllowed - balance.usedDays;

  if (balance.remainingDays < -5) {
    throw { statusCode: 400, message: `Cannot adjust: remaining days would be ${balance.remainingDays}` };
  }

  await balance.save();
};

const addExtraLeavesBulk = async ({ userId, role, employeeIds, extraDays, reason, adminId }) => {
  const scopedUserIds = await getScopedUserIds({ userId, role });
  const allowedIds = scopedUserIds || (await User.find({ isActive: true }).distinct('_id'));
  const targetIds = employeeIds === 'ALL'
    ? allowedIds
    : (employeeIds || []).filter((id) => allowedIds.some((allowedId) => allowedId.toString() === id.toString()));

  if (!targetIds.length) {
    throw { statusCode: 400, message: 'No employees selected' };
  }

  for (const employeeId of targetIds) {
    await addExtraLeaves({ employeeId, extraDays, reason, adminId });
  }

  return getLeaveBalances({ userId, role });
};

const getLeaveRequests = async ({ userId, role, filters }) => {
  const { status, type, from, to, page = 1, limit = 10, employee_id } = filters;
  let query = {};

  if (employee_id) {
    // Explicit employee filter — applies to all roles (used by My Leave tab)
    query.employeeId = employee_id;
  } else if (role === 'EMPLOYEE') {
    // Employees can only see their own leave
    query.employeeId = userId;
  } else if (role === 'MANAGER') {
    // Get team members but exclude the manager themselves
    const scopedIds = await getScopedUserIds({ userId, role });
    const teamMemberIds = scopedIds.filter(id => id.toString() !== userId.toString());
    query.employeeId = { $in: teamMemberIds };
  }
  // SUPER_ADMIN with no employee_id: no filter, sees all

  if (status) query.status = status;
  if (type) query.leaveTypeId = type;
  
  if (from || to) {
    query.$or = [];
    if (from && to) {
      query.$or.push({ startDate: { $lte: new Date(to) }, endDate: { $gte: new Date(from) } });
    } else if (from) {
      query.endDate = { $gte: new Date(from) };
    } else if (to) {
      query.startDate = { $lte: new Date(to) };
    }
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    LeaveRequest.find(query)
      .populate('employeeId', 'name department')
      .populate('leaveTypeId', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    LeaveRequest.countDocuments(query)
  ]);

  return { 
    data: data.map(mapLeaveRequest), 
    total, 
    page: parseInt(page), 
    limit: parseInt(limit) 
  };
};

const createLeaveRequest = async ({ employeeId, leaveTypeId, startDate, endDate, totalDays, reason }) => {
  const balance = await getLeaveBalanceInfo(employeeId);
  
  if (balance && balance.remainingDays < totalDays) {
    throw { statusCode: 400, message: `Insufficient leave balance. Available: ${balance.remainingDays} days` };
  }

  const overlap = await LeaveRequest.findOne({
    employeeId,
    status: { $ne: 'rejected' },
    $or: [
      { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
    ]
  });

  if (overlap) {
    throw { statusCode: 400, message: 'Leave dates overlap with an existing request' };
  }

  const request = await LeaveRequest.create({
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    totalDays,
    reason
  });

  return mapLeaveRequest(request);
};

const deleteLeaveRequest = async (id, userId) => {
  const request = await LeaveRequest.findById(id);
  if (!request) throw { statusCode: 404, message: 'Leave request not found' };
  if (request.employeeId.toString() !== userId.toString()) throw { statusCode: 403, message: 'Not authorized' };
  if (request.status !== 'pending') throw { statusCode: 400, message: 'Can only delete pending requests' };
  
  await LeaveRequest.findByIdAndDelete(id);
};

const reviewLeaveRequest = async ({ id, reviewerId, status, reviewNote }) => {
  const request = await LeaveRequest.findById(id);
  if (!request) throw { statusCode: 404, message: 'Leave request not found' };
  if (request.status !== 'pending') throw { statusCode: 400, message: 'Request already reviewed' };

  request.status = status;
  request.reviewedBy = reviewerId;
  request.reviewNote = reviewNote;
  await request.save();

  if (status === 'approved') {
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      userId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      year: currentYear
    });

    if (balance) {
      balance.usedDays += request.totalDays;
      balance.remainingDays -= request.totalDays;
      await balance.save();
    }
  }

  return mapLeaveRequest(request);
};

const getOtherLeaveRequests = async ({ userId, role, filters }) => {
  const { status, page = 1, limit = 10 } = filters;
  let query = {};

  if (role === 'EMPLOYEE') {
    query.employeeId = userId;
  } else if (role === 'MANAGER') {
    query.employeeId = { $in: await getScopedUserIds({ userId, role }) };
  }

  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    OtherLeaveRequest.find(query)
      .populate('employeeId', 'name department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    OtherLeaveRequest.countDocuments(query)
  ]);

  return { 
    data: data.map(mapLeaveRequest), 
    total, 
    page: parseInt(page), 
    limit: parseInt(limit) 
  };
};

const createOtherLeaveRequest = async ({ employeeId, startDate, endDate, totalDays, reason }) => {
  const overlap = await OtherLeaveRequest.findOne({
    employeeId,
    status: { $ne: 'rejected' },
    $or: [
      { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
    ]
  });

  if (overlap) throw { statusCode: 400, message: 'Leave dates overlap with an existing request' };

  const request = await OtherLeaveRequest.create({
    employeeId,
    startDate,
    endDate,
    totalDays,
    reason
  });
  
  return mapLeaveRequest(request);
};

const reviewOtherLeaveRequest = async ({ id, reviewerId, status, reviewNote }) => {
  const request = await OtherLeaveRequest.findById(id);
  if (!request) throw { statusCode: 404, message: 'Leave request not found' };
  if (request.status !== 'pending') throw { statusCode: 400, message: 'Request already reviewed' };

  request.status = status;
  request.reviewedBy = reviewerId;
  request.reviewNote = reviewNote;
  
  await request.save();
  return mapLeaveRequest(request);
};

export { 
  getLeaveTypes, getLeaveBalances, getLeaveBalanceInfo, addExtraLeaves, addExtraLeavesBulk, adjustExtraLeaves,
  getLeaveRequests, createLeaveRequest, deleteLeaveRequest, reviewLeaveRequest,
  getOtherLeaveRequests, createOtherLeaveRequest, reviewOtherLeaveRequest
};
