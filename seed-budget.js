import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

import { MonthlyBudget } from '../server/src/models/MonthlyBudget.js';
import { User } from '../server/src/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/office-flow';

async function seedBudget() {
  try {
    console.log('Connecting to MongoDB...', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    
    const adminUser = await User.findOne({ role: 'SUPER_ADMIN' });
    const adminId = adminUser ? adminUser._id : null;

    // Remove existing
    await MonthlyBudget.deleteMany({});
    
    // Create new (monthly = 5000, quarterly = 15000)
    await MonthlyBudget.create({
      monthlyAmount: mongoose.Types.Decimal128.fromString('5000'),
      effectiveFrom: new Date(),
      createdBy: adminId
    });
    
    console.log('Successfully seeded budget: 5000 monthly / 15000 quarterly');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedBudget();
