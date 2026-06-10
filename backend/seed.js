/**
 * Database seeding script
 * Run this once to populate initial data
 * Usage: node backend/seed.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Violation = require('./models/Violation');
const Division = require('./models/Division');

const DEFAULT_VIOLATIONS = [
  { name: 'Parking Violation', description: 'Illegal or unauthorized parking' },
  { name: 'Encroachment', description: 'Unauthorized encroachment on public property' },
  { name: 'Dumping Waste', description: 'Illegal waste disposal' },
  { name: 'Illegal Construction', description: 'Unauthorized construction or modification' },
  { name: 'Traffic Violation', description: 'Violation of traffic rules' },
  { name: 'Noise Pollution', description: 'Excessive noise violation' },
  { name: 'Water Wastage', description: 'Unnecessary water wastage' },
  { name: 'Other', description: 'Other violations' }
];

const DEFAULT_DIVISIONS = [
  {
    name: 'Charminar',
    code: '28',
    description: 'Charminar Division',
    wards: [
      { number: '97', name: 'Purani Haveli' },
      { number: '98', name: 'Pathergatti' },
      { number: '99', name: 'Hari Bowli' }
    ]
  },
  { name: 'Secunderabad', code: 'SEC', description: 'Secunderabad Division' },
  { name: 'Khairatabad', code: 'KHR', description: 'Khairatabad Division' },
  { name: 'LB Nagar', code: 'LBN', description: 'LB Nagar Division' },
  { name: 'Serilingampally', code: 'SER', description: 'Serilingampally Division' },
  { name: 'Kukatpally', code: 'KUK', description: 'Kukatpally Division' },
  {
    name: 'Malakpet',
    code: '27',
    description: 'Malakpet Division',
    wards: [
      { number: '88', name: 'Saidabad' },
      { number: '89', name: 'Asmangadh' },
      { number: '93', name: 'Akberbagh' }
    ]
  },
  { name: 'Musheerabad', code: 'MUS', description: 'Musheerabad Division' },
  { name: 'Amberpet', code: 'AMB', description: 'Amberpet Division' },
  { name: 'Nampally', code: 'NAM', description: 'Nampally Division' },
  { name: 'Rajendranagar', code: 'RAJ', description: 'Rajendranagar Division' }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/ghmc-challan';
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Seed Violations
    console.log('Seeding violations...');
    const violationCount = await Violation.countDocuments();
    if (violationCount === 0) {
      await Violation.insertMany(DEFAULT_VIOLATIONS);
      console.log(`✓ ${DEFAULT_VIOLATIONS.length} violation types added`);
    } else {
      console.log(`✓ Violations already exist (${violationCount} found)`);
    }

    // Seed Divisions
    console.log('Seeding divisions...');
    const divisionCount = await Division.countDocuments();
    if (divisionCount === 0) {
      await Division.insertMany(DEFAULT_DIVISIONS);
      console.log(`✓ ${DEFAULT_DIVISIONS.length} divisions added`);
    } else {
      console.log(`✓ Divisions already exist (${divisionCount} found)`);
    }

    console.log('\n✓ Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
