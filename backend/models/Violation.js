const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Violation name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
violationSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Violation', violationSchema);
