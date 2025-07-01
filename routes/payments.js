const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const RentSchedule = require('../models/RentSchedule');
const Property = require('../models/Property');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/payments
// @desc    Get payments with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      propertyId,
      tenantId,
      paymentDateFrom,
      paymentDateTo,
      paymentMethod
    } = req.query;

    const query = {};

    // Role-based filtering
    if (req.user.role === 'tenant') {
      query.tenant = req.user._id;
    } else if (req.user.role === 'landlord') {
      // Get properties owned by landlord
      const properties = await Property.find({ landlord: req.user._id }).select('_id');
      const propertyIds = properties.map(p => p._id);
      query.property = { $in: propertyIds };
    }

    // Apply filters
    if (status) query.status = status;
    if (propertyId) query.property = propertyId;
    if (tenantId && req.user.role === 'admin') query.tenant = tenantId;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentDateFrom || paymentDateTo) {
      query.paymentDate = {};
      if (paymentDateFrom) query.paymentDate.$gte = new Date(paymentDateFrom);
      if (paymentDateTo) query.paymentDate.$lte = new Date(paymentDateTo);
    }

    const payments = await Payment.find(query)
      .populate('property', 'name address monthlyRent')
      .populate('tenant', 'firstName lastName email')
      .populate('rentSchedule', 'dueDate amount')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ paymentDate: -1 });

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/payments
// @desc    Create new payment
// @access  Private
router.post('/', [
  auth,
  body('rentSchedule').isMongoId().withMessage('Valid rent schedule ID required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentMethod').isIn(['online', 'check', 'cash', 'bank-transfer']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { rentSchedule: rentScheduleId, amount, paymentMethod, notes } = req.body;

    // Verify rent schedule exists
    const rentSchedule = await RentSchedule.findById(rentScheduleId)
      .populate('property', 'landlord');

    if (!rentSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Rent schedule not found'
      });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' ||
      rentSchedule.property.landlord.toString() === req.user._id.toString() ||
      rentSchedule.tenant.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment = new Payment({
      rentSchedule: rentScheduleId,
      property: rentSchedule.property._id,
      tenant: rentSchedule.tenant,
      amount,
      paymentMethod,
      transactionId,
      notes,
      status: 'completed' // Default to completed for manual payments
    });

    await payment.save();

    // Update rent schedule status if payment covers full amount
    if (amount >= rentSchedule.amount) {
      await RentSchedule.findByIdAndUpdate(rentScheduleId, {
        status: 'paid'
      });
    } else if (amount > 0) {
      await RentSchedule.findByIdAndUpdate(rentScheduleId, {
        status: 'partial'
      });
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('property', 'name address monthlyRent')
      .populate('tenant', 'firstName lastName email')
      .populate('rentSchedule', 'dueDate amount status');

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment: populatedPayment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 