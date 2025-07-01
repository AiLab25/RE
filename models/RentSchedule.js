const mongoose = require('mongoose');

const rentScheduleSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'check', 'cash', 'bank-transfer'],
    default: 'online'
  },
  lateFee: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  recurring: {
    type: Boolean,
    default: true
  },
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  }
}, {
  timestamps: true
});

rentScheduleSchema.index({ property: 1, tenant: 1, dueDate: 1 });

module.exports = mongoose.model('RentSchedule', rentScheduleSchema); 