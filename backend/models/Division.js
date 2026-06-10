const mongoose = require('mongoose');

const divisionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Division name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  wards: [
    {
      number: {
        type: String,
        required: [true, 'Ward number is required'],
        trim: true
      },
      name: {
        type: String,
        required: [true, 'Ward name is required'],
        trim: true
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }
  ],
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
divisionSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Division', divisionSchema);
