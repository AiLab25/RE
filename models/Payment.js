const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  rentSchedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentSchedule',
    required: true
  },
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
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'check', 'cash', 'bank-transfer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true
  },
  receipt: {
    type: String
  },
  notes: {
    type: String,
    trim: true
  },
  lateFeePaid: {
    type: Number,
    default: 0
  },
  partialPayment: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

paymentSchema.index({ tenant: 1, property: 1, paymentDate: -1 });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema); 