const express = require('express');
const { body, validationResult } = require('express-validator');
const Property = require('../models/Property');
const { auth, authorize, isOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/properties
// @desc    Get all properties with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      propertyType,
      city,
      state,
      minRent,
      maxRent,
      search
    } = req.query;

    const query = {};

    // Role-based filtering
    if (req.user.role === 'landlord') {
      query.landlord = req.user._id;
    } else if (req.user.role === 'tenant') {
      query.currentTenant = req.user._id;
    }

    // Apply filters
    if (status) query.status = status;
    if (propertyType) query.propertyType = propertyType;
    if (city) query['address.city'] = { $regex: city, $options: 'i' };
    if (state) query['address.state'] = { $regex: state, $options: 'i' };
    if (minRent || maxRent) {
      query.monthlyRent = {};
      if (minRent) query.monthlyRent.$gte = Number(minRent);
      if (maxRent) query.monthlyRent.$lte = Number(maxRent);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const properties = await Property.find(query)
      .populate('landlord', 'firstName lastName email')
      .populate('currentTenant', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      properties,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/properties/:id
// @desc    Get property by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlord', 'firstName lastName email phone')
      .populate('currentTenant', 'firstName lastName email phone')
      .populate('maintenanceHistory.reportedBy', 'firstName lastName');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'tenant' && property.currentTenant?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'landlord' && property.landlord._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/properties
// @desc    Create new property
// @access  Private/Admin/Landlord
router.post('/', [
  auth,
  authorize('admin', 'landlord'),
  body('name').notEmpty().trim(),
  body('address.street').notEmpty().trim(),
  body('address.city').notEmpty().trim(),
  body('address.state').notEmpty().trim(),
  body('address.zipCode').notEmpty().trim(),
  body('propertyType').isIn(['apartment', 'house', 'condo', 'townhouse', 'commercial']),
  body('monthlyRent').isNumeric().withMessage('Monthly rent must be a number'),
  body('bedrooms').optional().isNumeric(),
  body('bathrooms').optional().isNumeric(),
  body('squareFootage').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const propertyData = {
      ...req.body,
      landlord: req.user.role === 'landlord' ? req.user._id : req.body.landlord
    };

    const property = new Property(propertyData);
    await property.save();

    const populatedProperty = await Property.findById(property._id)
      .populate('landlord', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property: populatedProperty
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private
router.put('/:id', [
  auth,
  body('name').optional().notEmpty().trim(),
  body('address.street').optional().notEmpty().trim(),
  body('address.city').optional().notEmpty().trim(),
  body('address.state').optional().notEmpty().trim(),
  body('address.zipCode').optional().notEmpty().trim(),
  body('propertyType').optional().isIn(['apartment', 'house', 'condo', 'townhouse', 'commercial']),
  body('monthlyRent').optional().isNumeric(),
  body('status').optional().isIn(['available', 'occupied', 'maintenance', 'unavailable'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check permissions
    if (req.user.role === 'landlord' && property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('landlord', 'firstName lastName email')
      .populate('currentTenant', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete property
// @access  Private/Admin/Landlord
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check permissions
    if (req.user.role === 'landlord' && property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/properties/:id/maintenance
// @desc    Add maintenance request
// @access  Private
router.post('/:id/maintenance', [
  auth,
  body('issue').notEmpty().trim(),
  body('description').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user has access to this property
    const hasAccess = req.user.role === 'admin' ||
      property.landlord.toString() === req.user._id.toString() ||
      property.currentTenant?.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const maintenanceRequest = {
      issue: req.body.issue,
      description: req.body.description,
      reportedBy: req.user._id,
      reportedDate: new Date()
    };

    property.maintenanceHistory.push(maintenanceRequest);
    await property.save();

    const updatedProperty = await Property.findById(req.params.id)
      .populate('maintenanceHistory.reportedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Maintenance request added successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Add maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 