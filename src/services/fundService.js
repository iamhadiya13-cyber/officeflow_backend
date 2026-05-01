import { User } from '../models/User.js';
import { EmployeeFundContribution } from '../models/EmployeeFundContribution.js';
import { EmployeeFund } from '../models/EmployeeFund.js';
import { ExpenseRequest } from '../models/ExpenseRequest.js';
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

    // Fetch all JOINING contributions (no year required)
    const joiningContributions = await EmployeeFundContribution.find({ 
      contributionType: 'JOINING' 
    }).populate('collectedBy', 'name');

    // Aggregate Employee Fund Balance from actual contributions minus TEAM_FUND expenses.
    const [allContributions, teamFundExpenses] = await Promise.all([
      EmployeeFundContribution.find({}),
      ExpenseRequest.find({ expenseType: 'TEAM_FUND', isArchived: false }),
    ]);
    const totalContributions = allContributions.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
    const totalTeamFundExpenses = teamFundExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const currentBalance = totalContributions - totalTeamFundExpenses;

    // Sync it to EmployeeFund to fix any drift
    await EmployeeFund.findOneAndUpdate(
      {},
      { balance: toDecimal(currentBalance), lastUpdatedAt: new Date() },
      { upsert: true, new: true }
    );

    const data = users.map(user => {
      const birthdayContrib = birthdayContributions.find(c => c.employeeId.toString() === user._id.toString());
      const joiningContrib = joiningContributions.find(c => c.employeeId.toString() === user._id.toString());

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
        
        joiningCollected: !!joiningContrib,
        joiningCollectedAt: joiningContrib ? joiningContrib.contributedAt : null,
        joiningCollectedBy: joiningContrib?.collectedBy?.name || null,
        joiningId: joiningContrib?._id || null,
        birthdayId: birthdayContrib?._id || null,
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
      if (user.role === 'INTERN') {
        throw { statusCode: 400, message: 'Interns do not need to pay birthday fund' };
      }

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
    } else if (type === 'JOINING') {
      amount = 1000;
      const existing = await EmployeeFundContribution.findOne({ employeeId, contributionType: 'JOINING' });
      if (existing) throw { statusCode: 400, message: 'Joining fund already collected' };

      await EmployeeFundContribution.create({
        employeeId,
        contributionType: 'JOINING',
        amount: toDecimal(amount),
        collectedBy: adminId,
        note: `Joining (Intern to Full-Time) collection for ${user.name}`
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
  },

  revertFund: async ({ id, adminId }) => {
    const contribution = await EmployeeFundContribution.findById(id);
    if (!contribution) throw { statusCode: 404, message: 'Contribution not found' };

    const amountToDeduct = parseFloat(contribution.amount.toString());

    await EmployeeFundContribution.findByIdAndDelete(id);

    await EmployeeFund.findOneAndUpdate(
      {}, 
      { $inc: { balance: -amountToDeduct }, lastUpdatedAt: new Date(), lastUpdatedBy: adminId }, 
      { new: true }
    );

    return { success: true, message: 'Fund collection reverted successfully' };
  }
};
