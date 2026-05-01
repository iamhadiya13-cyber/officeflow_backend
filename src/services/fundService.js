import { User } from '../models/User.js';
import { EmployeeFundContribution } from '../models/EmployeeFundContribution.js';
import { EmployeeFund } from '../models/EmployeeFund.js';
import { toDecimal } from '../utils/validators.js';
import mongoose from 'mongoose';

export const fundService = {
  getTeamFundStatus: async (year) => {
    // Drop the old index if exists to prevent errors
    try {
      await EmployeeFundContribution.collection.dropIndex('employeeId_1_contributionYear_1');
    } catch (e) {
      // Ignore if index does not exist
    }

    const users = await User.find({ isActive: true }).select('name email role dateOfBirth department');
    
    // Fetch all BIRTHDAY contributions for this year
    const birthdayContributions = await EmployeeFundContribution.find({ 
      contributionType: 'BIRTHDAY', 
      contributionYear: year 
    }).populate('collectedBy', 'name');

    // Fetch all PROMOTION contributions (no year required)
    const promotionContributions = await EmployeeFundContribution.find({ 
      contributionType: 'PROMOTION' 
    }).populate('collectedBy', 'name');

    // Aggregate Employee Fund Balance
    const fund = await EmployeeFund.findOne();
    const currentBalance = fund ? parseFloat(fund.balance.toString()) : 0;

    const data = users.map(user => {
      const birthdayContrib = birthdayContributions.find(c => c.employeeId.toString() === user._id.toString());
      const promotionContrib = promotionContributions.find(c => c.employeeId.toString() === user._id.toString());

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        dateOfBirth: user.dateOfBirth,
        birthdayCollected: !!birthdayContrib,
        birthdayCollectedAt: birthdayContrib ? birthdayContrib.contributedAt : null,
        birthdayCollectedBy: birthdayContrib?.collectedBy?.name || null,
        
        promotionCollected: !!promotionContrib,
        promotionCollectedAt: promotionContrib ? promotionContrib.contributedAt : null,
        promotionCollectedBy: promotionContrib?.collectedBy?.name || null,
      };
    });

    return {
      currentBalance,
      year,
      users: data
    };
  },

  collectFund: async ({ employeeId, type, year, adminId }) => {
    const user = await User.findById(employeeId);
    if (!user) throw { statusCode: 404, message: 'User not found' };

    let amount = 0;
    if (type === 'BIRTHDAY') {
      amount = 1250;
      const existing = await EmployeeFundContribution.findOne({ employeeId, contributionType: 'BIRTHDAY', contributionYear: year });
      if (existing) throw { statusCode: 400, message: 'Birthday fund already collected for this year' };
      
      await EmployeeFundContribution.create({
        employeeId,
        contributionType: 'BIRTHDAY',
        amount: toDecimal(amount),
        contributionYear: year,
        collectedBy: adminId,
        note: `Birthday collection for ${user.name} (${year})`
      });
    } else if (type === 'PROMOTION') {
      amount = 1000;
      const existing = await EmployeeFundContribution.findOne({ employeeId, contributionType: 'PROMOTION' });
      if (existing) throw { statusCode: 400, message: 'Promotion fund already collected' };

      await EmployeeFundContribution.create({
        employeeId,
        contributionType: 'PROMOTION',
        amount: toDecimal(amount),
        collectedBy: adminId,
        note: `Promotion (Intern to Full-Time) collection for ${user.name}`
      });
    } else {
      throw { statusCode: 400, message: 'Invalid contribution type' };
    }

    // Update global team fund balance
    await EmployeeFund.findOneAndUpdate(
      {}, 
      { $inc: { balance: amount }, lastUpdatedAt: new Date(), lastUpdatedBy: adminId }, 
      { upsert: true, new: true }
    );

    return { success: true, message: 'Fund collected successfully' };
  }
};
