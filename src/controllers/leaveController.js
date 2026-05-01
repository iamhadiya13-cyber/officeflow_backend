import * as leaveService from '../services/leaveService.js';
import { successResponse, errorResponse } from '../utils/response.js';

const getTypes = async (req, res) => {
  try {
    const types = await leaveService.getLeaveTypes();
    return res.json(successResponse('Leave types loaded', types));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getMyBalance = async (req, res) => {
  try {
    const balance = await leaveService.getLeaveBalanceInfo(req.user._id);
    return res.json(successResponse('My leave balance', balance));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getUserBalance = async (req, res) => {
  try {
    const balances = await leaveService.getLeaveBalances({ userId: req.user._id, role: req.user.role });
    const targetUserId = req.params.userId;
    const data = targetUserId ? balances.filter((balance) => balance.user_id === targetUserId) : balances;
    return res.json(successResponse('User balances loaded', data));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const addExtraLeaves = async (req, res) => {
  try {
    const employeeId = req.params.userId;
    await leaveService.addExtraLeaves({
      employeeId,
      extraDays: Number(req.body.extra_days ?? req.body.extraDays ?? 0),
      reason: req.body.reason,
      adminId: req.user._id
    });
    const balance = await leaveService.getLeaveBalances({ userId: req.user._id, role: req.user.role });
    return res.json(successResponse('Extra leaves added', balance));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const addExtraLeavesBulk = async (req, res) => {
  try {
    const employeeIds = req.body.apply_to_all ? 'ALL' : (req.body.employee_ids || req.body.employeeIds || []);
    const balances = await leaveService.addExtraLeavesBulk({
      userId: req.user._id,
      role: req.user.role,
      employeeIds,
      extraDays: Number(req.body.extra_days ?? req.body.extraDays ?? 0),
      reason: req.body.reason,
      adminId: req.user._id
    });
    return res.json(successResponse('Extra leaves added', balances));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const adjustExtraLeaves = async (req, res) => {
  try {
    const employeeId = req.params.userId;
    await leaveService.adjustExtraLeaves({
      employeeId,
      adjustment: Number(req.body.adjustment ?? 0),
      reason: req.body.reason,
      adminId: req.user._id
    });
    const balance = await leaveService.getLeaveBalances({ userId: req.user._id, role: req.user.role });
    return res.json(successResponse('Leave balance adjusted', balance));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getRequests = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const result = await leaveService.getLeaveRequests({ userId, role, filters: req.query });
    return res.json(successResponse('Leave requests loaded', result.data, { total: result.total, page: result.page, limit: result.limit }));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const createRequest = async (req, res) => {
  try {
    const request = await leaveService.createLeaveRequest({
      employeeId: req.body.employee_id || req.body.employeeId || req.user._id,
      leaveTypeId: req.body.leave_type_id || req.body.leaveTypeId,
      startDate: req.body.start_date || req.body.startDate,
      endDate: req.body.end_date || req.body.endDate,
      totalDays: Number(req.body.total_days ?? req.body.totalDays ?? 0),
      reason: req.body.reason
    });
    return res.json(successResponse('Leave request created', request));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getOne = async (req, res) => {
  return res.json(successResponse('endpoint stub', {}));
};

const deleteRequest = async (req, res) => {
  try {
    await leaveService.deleteLeaveRequest(req.params.id, req.user._id);
    return res.json(successResponse('Leave request deleted'));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const review = async (req, res) => {
  try {
    const request = await leaveService.reviewLeaveRequest({
      id: req.params.id,
      reviewerId: req.user._id,
      status: req.body.status,
      reviewNote: req.body.review_note ?? req.body.reviewNote ?? ''
    });
    return res.json(successResponse('Leave request reviewed', request));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const getOtherRequests = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const result = await leaveService.getOtherLeaveRequests({ userId, role, filters: req.query });
    return res.json(successResponse('Other leave requests loaded', result.data, { total: result.total, page: result.page, limit: result.limit }));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const createOtherRequest = async (req, res) => {
  try {
    const request = await leaveService.createOtherLeaveRequest({
      employeeId: req.body.employee_id || req.body.employeeId || req.user._id,
      startDate: req.body.start_date || req.body.startDate,
      endDate: req.body.end_date || req.body.endDate,
      totalDays: Number(req.body.total_days ?? req.body.totalDays ?? 0),
      reason: req.body.reason
    });
    return res.json(successResponse('Other leave request created', request));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

const reviewOther = async (req, res) => {
  try {
    const request = await leaveService.reviewOtherLeaveRequest({
      id: req.params.id,
      reviewerId: req.user._id,
      status: req.body.status,
      reviewNote: req.body.review_note ?? req.body.reviewNote ?? ''
    });
    return res.json(successResponse('Other leave request reviewed', request));
  } catch (err) {
    return res.status(err.statusCode || 500).json(errorResponse(err.message));
  }
};

export const leaveController = {
  getTypes, getMyBalance, getUserBalance, addExtraLeaves, adjustExtraLeaves,
  addExtraLeavesBulk,
  getRequests, createRequest, getOne, deleteRequest, review,
  getOtherRequests, createOtherRequest, reviewOther
};
