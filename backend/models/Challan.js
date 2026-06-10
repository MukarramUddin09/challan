const mongoose = require('mongoose');

const challanSchema = new mongoose.Schema({
  noticeNumber: {
    type: String,
    required: true,
    unique: true
  },
  division: {
    type: String,
    required: [true, 'Division is required']
  },
  divisionCode: {
    type: String,
    trim: true
  },
  wardNumber: {
    type: String,
    required: [true, 'Ward number is required'],
    trim: true
  },
  wardName: {
    type: String,
    required: [true, 'Ward name is required'],
    trim: true
  },
  violatorPhone: {
    type: String,
    required: [true, 'Violator phone is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Challan', 'Fine'],
    default: 'Challan'
  },
  location: {
    type: String,
    required: [true, 'Location of violation is required'],
    trim: true
  },
  violatorName: {
    type: String,
    required: [true, 'Violator name is required'],
    trim: true
  },
  violationType: [{
    type: String,
    required: true
  }],
  fineAmount: {
    type: Number,
    required: [true, 'Fine amount is required'],
    min: 0,
    set: (value) => {
      const amount = Number(value);
      return Number.isFinite(amount)
        ? Math.round((amount + Number.EPSILON) * 100) / 100
        : value;
    },
    validate: {
      validator: (value) => Number.isSafeInteger(Math.round(value * 100)),
      message: 'Fine amount is outside the supported range'
    }
  },
  officerName: {
    type: String,
    required: [true, 'Officer name is required'],
    trim: true
  },
  officerDesignation: {
    type: String,
    required: [true, 'Officer designation is required'],
    trim: true
  },
  legalText: {
    type: String,
    default: 'Whereas it is found that without the written permission of Competent authority you have placed / deposited on the roads / footpaths / public places / open spaces material/goods/articles or have committed the violation as mentioned in the notice below and thereby violated the provisions of GHMC Act / Public Health Act and whereas you are liable to pay the fine amount as mentioned, you are hereby requested to pay the said fine immediately.'
  },
  dateTime: {
    type: Date,
    default: Date.now
  },
  photoFilename: {
    type: String,
    trim: true,
    default: null
  },
  sentToEmails: [{
    type: String
  }],
  emailSentAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
challanSchema.index({ division: 1, createdAt: -1 });
challanSchema.index({ createdBy: 1 });
// `noticeNumber` already declares `unique: true` on the field which creates
// an index. Avoid declaring the same index twice to prevent duplicate-index
// warnings from Mongoose.

module.exports = mongoose.model('Challan', challanSchema);
