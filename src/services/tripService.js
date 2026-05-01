import TripRequest from '../models/TripRequest.js';
import TripItinerary from '../models/TripItinerary.js';
import ExpenseRequest from '../models/ExpenseRequest.js';
import User from '../models/User.js';
import { calculateDays } from '../utils/dateHelper.js';
import mongoose from 'mongoose';

const getTrips = async ({ userId, role, filters }) => {
  const { status, from, to, page = 1, limit = 10 } = filters;
  let query = {};

  if (role === 'EMPLOYEE') {
    query.employeeId = userId;
  } else if (role === 'MANAGER') {
    const managerUsers = await User.find({ managerId: userId }).select('_id');
    const userIds = managerUsers.map(u => u._id);
    userIds.push(userId);
    query.employeeId = { $in: userIds };
  }

  if (status) query.status = status;

  if (from || to) {
    query.$or = [];
    if (from && to) {
      query.$or.push({ departureDate: { $lte: new Date(to) }, returnDate: { $gte: new Date(from) } });
    } else if (from) {
      query.returnDate = { $gte: new Date(from) };
    } else if (to) {
      query.departureDate = { $lte: new Date(to) };
    }
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    TripRequest.find(query)
      .populate('employeeId', 'name department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TripRequest.countDocuments(query)
  ]);

  return { 
    data: data.map(d => {
      const r = d.toJSON();
      return {
        ...r,
        employee_name: r.employeeId?.name,
        department: r.employeeId?.department,
        reviewer_name: r.reviewedBy?.name
      };
    }), 
    total, 
    page: parseInt(page), 
    limit: parseInt(limit) 
  };
};

const createTrip = async ({ employeeId, title, destination, purpose, departureDate, returnDate, estimatedBudget, itinerary }) => {
  const totalDays = calculateDays(departureDate, returnDate);

  const trip = await TripRequest.create({
    employeeId,
    title,
    destination,
    purpose,
    departureDate,
    returnDate,
    totalDays,
    estimatedBudget: mongoose.Types.Decimal128.fromString(parseFloat(estimatedBudget).toFixed(2))
  });

  if (itinerary && itinerary.length > 0) {
    const itineraryDocs = itinerary.map(item => ({
      tripRequestId: trip._id,
      dayNumber: item.day_number || item.dayNumber,
      date: item.date,
      activities: item.activities,
      notes: item.notes
    }));
    await TripItinerary.insertMany(itineraryDocs);
  }

  return trip.toJSON();
};

const getTripById = async (id) => {
  const trip = await TripRequest.findById(id)
    .populate('employeeId', 'name department')
    .populate('reviewedBy', 'name');

  if (!trip) return null;

  const itinerary = await TripItinerary.find({ tripRequestId: id }).sort('dayNumber');
  
  const expenses = await ExpenseRequest.find({ tripRequestId: id, isArchived: false })
    .sort('submittedAt');

  const r = trip.toJSON();
  return {
    ...r,
    employee_name: r.employeeId?.name,
    department: r.employeeId?.department,
    reviewer_name: r.reviewedBy?.name,
    itinerary: itinerary.map(i => i.toJSON()),
    expenses: expenses.map(e => e.toJSON()),
  };
};

const updateTrip = async ({ id, userId, title, destination, purpose, departureDate, returnDate, estimatedBudget, itinerary }) => {
  const existing = await TripRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Trip not found' };
  if (existing.employeeId.toString() !== userId.toString()) throw { statusCode: 403, message: 'Not authorized' };
  if (existing.status !== 'pending') throw { statusCode: 400, message: 'Can only edit pending trips' };

  existing.title = title;
  existing.destination = destination;
  existing.purpose = purpose;
  existing.departureDate = departureDate;
  existing.returnDate = returnDate;
  existing.totalDays = calculateDays(departureDate, returnDate);
  existing.estimatedBudget = mongoose.Types.Decimal128.fromString(parseFloat(estimatedBudget).toFixed(2));
  
  await existing.save();

  if (itinerary) {
    await TripItinerary.deleteMany({ tripRequestId: id });
    const itineraryDocs = itinerary.map(item => ({
      tripRequestId: id,
      dayNumber: item.day_number || item.dayNumber,
      date: item.date,
      activities: item.activities,
      notes: item.notes
    }));
    await TripItinerary.insertMany(itineraryDocs);
  }

  return existing.toJSON();
};

const cancelTrip = async (id, userId, role) => {
  const existing = await TripRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Trip not found' };

  if (role === 'EMPLOYEE' && existing.employeeId.toString() !== userId.toString()) {
    throw { statusCode: 403, message: 'Not authorized' };
  }

  if (!['pending', 'approved'].includes(existing.status)) {
    throw { statusCode: 400, message: 'Can only cancel pending or approved trips' };
  }

  existing.status = 'cancelled';
  await existing.save();

  await ExpenseRequest.updateMany(
    { tripRequestId: id, isSettled: false, isArchived: false },
    { 
      isArchived: true, 
      archivedBy: userId, 
      archivedAt: new Date(), 
      archiveReason: 'Trip cancelled' 
    }
  );

  return existing.toJSON();
};

const reviewTrip = async ({ id, reviewerId, status, reviewNote }) => {
  const existing = await TripRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Trip not found' };
  if (existing.status !== 'pending') throw { statusCode: 400, message: 'Trip already reviewed' };

  existing.status = status;
  existing.reviewedBy = reviewerId;
  existing.reviewNote = reviewNote;
  
  await existing.save();

  return existing.toJSON();
};

const completeTrip = async (id) => {
  const existing = await TripRequest.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Trip not found' };
  if (existing.status !== 'approved') throw { statusCode: 400, message: 'Can only complete approved trips' };

  existing.status = 'completed';
  await existing.save();

  return existing.toJSON();
};

const getTripExpenses = async (tripId) => {
  const expenses = await ExpenseRequest.find({ tripRequestId: tripId, isArchived: false })
    .sort('submittedAt');
  return expenses.map(e => e.toJSON());
};

export { getTrips, createTrip, getTripById, updateTrip, cancelTrip, reviewTrip, completeTrip, getTripExpenses };
