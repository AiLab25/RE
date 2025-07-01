const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Property = require('../models/Property');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tenants
// @desc    Get all tenants with filtering
// @access  Private/Admin/Landlord
router.get('/', auth, authorize('admin', 'landlord'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, hasProperty } = req.query;

    const query = { role: 'tenant' };

    // Landlord can only see tenants of their properties
    if (req.user.role === 'landlord') {
      const properties = await Property.find({ landlord: req.user._id }).select('currentTenant');
      const tenantIds = properties.map(p => p.currentTenant).filter(id => id);
      query._id = { $in: tenantIds };
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const tenants = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ firstName: 1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      tenants,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tenants/:id
// @desc    Get tenant by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const tenant = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'properties',
        select: 'name address monthlyRent status',
        match: req.user.role === 'landlord' ? { landlord: req.user._id } : {}
      });

    if (!tenant || tenant.role !== 'tenant') {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'tenant' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'landlord') {
      const hasAccess = await Property.exists({
        landlord: req.user._id,
        currentTenant: req.params.id
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/tenants/:id
// @desc    Update tenant information
// @access  Private
router.put('/:id', [
  auth,
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phone').optional().trim(),
  body('tenantInfo.emergencyContact.name').optional().trim(),
  body('tenantInfo.emergencyContact.phone').optional().trim(),
  body('tenantInfo.emergencyContact.relationship').optional().trim(),
  body('tenantInfo.moveInDate').optional().isISO8601(),
  body('tenantInfo.leaseEndDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const tenant = await User.findById(req.params.id);

    if (!tenant || tenant.role !== 'tenant') {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check permissions
    if (req.user.role === 'tenant' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'landlord') {
      const hasAccess = await Property.exists({
        landlord: req.user._id,
        currentTenant: req.params.id
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const updatedTenant = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: updatedTenant
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/tenants/:id/assign-property
// @desc    Assign tenant to property
// @access  Private/Admin/Landlord
router.post('/:id/assign-property', [
  auth,
  authorize('admin', 'landlord'),
  body('propertyId').isMongoId().withMessage('Valid property ID required'),
  body('moveInDate').optional().isISO8601(),
  body('leaseEndDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { propertyId, moveInDate, leaseEndDate } = req.body;
    const tenantId = req.params.id;

    // Verify tenant exists
    const tenant = await User.findById(tenantId);
    if (!tenant || tenant.role !== 'tenant') {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if landlord owns the property
    if (req.user.role === 'landlord' && property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if property is available
    if (property.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Property is not available for assignment'
      });
    }

    // Update property
    property.currentTenant = tenantId;
    property.status = 'occupied';
    if (moveInDate) property.leaseTerms = { ...property.leaseTerms, startDate: moveInDate };
    if (leaseEndDate) property.leaseTerms = { ...property.leaseTerms, endDate: leaseEndDate };

    await property.save();

    // Update tenant info
    const tenantUpdates = {};
    if (moveInDate) tenantUpdates['tenantInfo.moveInDate'] = moveInDate;
    if (leaseEndDate) tenantUpdates['tenantInfo.leaseEndDate'] = leaseEndDate;

    if (Object.keys(tenantUpdates).length > 0) {
      await User.findByIdAndUpdate(tenantId, tenantUpdates);
    }

    const updatedProperty = await Property.findById(propertyId)
      .populate('currentTenant', 'firstName lastName email')
      .populate('landlord', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Tenant assigned to property successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Assign tenant to property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/tenants/:id/remove-property
// @desc    Remove tenant from property
// @access  Private/Admin/Landlord
router.post('/:id/remove-property', [
  auth,
  authorize('admin', 'landlord'),
  body('propertyId').isMongoId().withMessage('Valid property ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { propertyId } = req.body;
    const tenantId = req.params.id;

    // Verify tenant exists
    const tenant = await User.findById(tenantId);
    if (!tenant || tenant.role !== 'tenant') {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if landlord owns the property
    if (req.user.role === 'landlord' && property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if tenant is currently assigned to this property
    if (property.currentTenant?.toString() !== tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is not currently assigned to this property'
      });
    }

    // Update property
    property.currentTenant = null;
    property.status = 'available';
    property.leaseTerms = {};

    await property.save();

    const updatedProperty = await Property.findById(propertyId)
      .populate('landlord', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Tenant removed from property successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Remove tenant from property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tenants/:id/properties
// @desc    Get properties assigned to tenant
// @access  Private
router.get('/:id/properties', auth, async (req, res) => {
  try {
    const tenantId = req.params.id;

    // Check permissions
    if (req.user.role === 'tenant' && req.user._id.toString() !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { currentTenant: tenantId };

    if (req.user.role === 'landlord') {
      query.landlord = req.user._id;
    }

    const properties = await Property.find(query)
      .populate('landlord', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      properties
    });
  } catch (error) {
    console.error('Get tenant properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 