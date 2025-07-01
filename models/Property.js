const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'USA'
    }
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'townhouse', 'commercial'],
    required: true
  },
  bedrooms: {
    type: Number,
    min: 0
  },
  bathrooms: {
    type: Number,
    min: 0
  },
  squareFootage: {
    type: Number,
    min: 0
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },
  securityDeposit: {
    type: Number,
    min: 0
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentTenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'unavailable'],
    default: 'available'
  },
  amenities: [{
    type: String
  }],
  description: {
    type: String,
    trim: true
  },
  images: [{
    type: String
  }],
  documents: [{
    name: String,
    url: String,
    type: String
  }],
  maintenanceHistory: [{
    issue: String,
    description: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    completedDate: Date,
    cost: Number
  }],
  leaseTerms: {
    startDate: Date,
    endDate: Date,
    renewalTerms: String
  }
}, {
  timestamps: true
});

// Virtual for full address
propertySchema.virtual('fullAddress').get(function () {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Index for search
propertySchema.index({
  'address.city': 1,
  'address.state': 1,
  status: 1
});

module.exports = mongoose.model('Property', propertySchema); 