const express = require('express');
const { body, validationResult } = require('express-validator');
const RentSchedule = require('../models/RentSchedule');
const Property = require('../models/Property');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/rent-schedules
// @desc    Get rent schedules with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      propertyId,
      dueDateFrom,
      dueDateTo,
      tenantId
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
    if (dueDateFrom || dueDateTo) {
      query.dueDate = {};
      if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo);
    }

    const rentSchedules = await RentSchedule.find(query)
      .populate('property', 'name address monthlyRent')
      .populate('tenant', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ dueDate: 1 });

    const total = await RentSchedule.countDocuments(query);

    res.json({
      success: true,
      rentSchedules,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get rent schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/rent-schedules/:id
// @desc    Get rent schedule by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const rentSchedule = await RentSchedule.findById(req.params.id)
      .populate('property', 'name address monthlyRent landlord')
      .populate('tenant', 'firstName lastName email phone');

    if (!rentSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Rent schedule not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'tenant' && rentSchedule.tenant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'landlord' && rentSchedule.property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      rentSchedule
    });
  } catch (error) {
    console.error('Get rent schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/rent-schedules
// @desc    Create new rent schedule
// @access  Private/Admin/Landlord
router.post('/', [
  auth,
  authorize('admin', 'landlord'),
  body('property').isMongoId().withMessage('Valid property ID required'),
  body('tenant').isMongoId().withMessage('Valid tenant ID required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date required'),
  body('paymentMethod').optional().isIn(['online', 'check', 'cash', 'bank-transfer']),
  body('recurring').optional().isBoolean(),
  body('frequency').optional().isIn(['monthly', 'quarterly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { property: propertyId, tenant: tenantId, ...scheduleData } = req.body;

    // Verify property exists and user has access
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (req.user.role === 'landlord' && property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const rentSchedule = new RentSchedule({
      property: propertyId,
      tenant: tenantId,
      ...scheduleData
    });

    await rentSchedule.save();

    const populatedSchedule = await RentSchedule.findById(rentSchedule._id)
      .populate('property', 'name address monthlyRent')
      .populate('tenant', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Rent schedule created successfully',
      rentSchedule: populatedSchedule
    });
  } catch (error) {
    console.error('Create rent schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/rent-schedules/:id
// @desc    Update rent schedule
// @access  Private
router.put('/:id', [
  auth,
  body('amount').optional().isNumeric(),
  body('dueDate').optional().isISO8601(),
  body('status').optional().isIn(['pending', 'paid', 'overdue', 'partial']),
  body('paymentMethod').optional().isIn(['online', 'check', 'cash', 'bank-transfer']),
  body('lateFee').optional().isNumeric(),
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

    const rentSchedule = await RentSchedule.findById(req.params.id)
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

    const updatedSchedule = await RentSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('property', 'name address monthlyRent')
      .populate('tenant', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Rent schedule updated successfully',
      rentSchedule: updatedSchedule
    });
  } catch (error) {
    console.error('Update rent schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/rent-schedules/:id
// @desc    Delete rent schedule
// @access  Private/Admin/Landlord
router.delete('/:id', auth, async (req, res) => {
  try {
    const rentSchedule = await RentSchedule.findById(req.params.id)
      .populate('property', 'landlord');

    if (!rentSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Rent schedule not found'
      });
    }

    // Check permissions
    if (req.user.role === 'landlord' && rentSchedule.property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await RentSchedule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Rent schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete rent schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/rent-schedules/bulk
// @desc    Create multiple rent schedules (for recurring payments)
// @access  Private/Admin/Landlord
router.post('/bulk', [
  auth,
  authorize('admin', 'landlord'),
  body('property').isMongoId(),
  body('tenant').isMongoId(),
  body('amount').isNumeric(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('frequency').isIn(['monthly', 'quarterly', 'yearly']),
  body('paymentMethod').optional().isIn(['online', 'check', 'cash', 'bank-transfer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { property, tenant, amount, startDate, endDate, frequency, paymentMethod } = req.body;

    // Verify property exists and user has access
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (req.user.role === 'landlord' && propertyDoc.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const schedules = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    let currentDate = new Date(start);

    while (currentDate <= end) {
      schedules.push({
        property,
        tenant,
        amount,
        dueDate: new Date(currentDate),
        paymentMethod: paymentMethod || 'online',
        recurring: true,
        frequency
      });

      // Calculate next date based on frequency
      switch (frequency) {
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    const createdSchedules = await RentSchedule.insertMany(schedules);

    res.status(201).json({
      success: true,
      message: `${createdSchedules.length} rent schedules created successfully`,
      count: createdSchedules.length
    });
  } catch (error) {
    console.error('Bulk create rent schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 