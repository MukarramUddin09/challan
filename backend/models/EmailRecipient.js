const mongoose = require('mongoose');

const emailRecipientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Recipient name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Recipient email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  division: {
    type: String,
    trim: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmailRecipient', emailRecipientSchema);
