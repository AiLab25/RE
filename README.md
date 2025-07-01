# Property Management System

A comprehensive property management web application built with Node.js, Express, and MongoDB. This system provides role-based access control for tenants, landlords, and administrators to manage properties, rent schedules, and payments.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Landlord, Tenant)
- Secure password hashing with bcrypt
- Session management

### 🏠 Property Management
- Add, edit, and delete properties
- Property status tracking (Available, Occupied, Maintenance, Unavailable)
- Property details including address, rent, amenities
- Maintenance request tracking
- Image and document upload support

### 👥 Tenant Management
- Tenant registration and profile management
- Property assignment and removal
- Emergency contact information
- Lease term tracking

### 📅 Rent Schedule Management
- Create recurring rent schedules
- Due date tracking
- Payment status monitoring
- Late fee calculation
- Bulk schedule creation

### 💳 Payment Processing
- Multiple payment methods (Online, Check, Cash, Bank Transfer)
- Payment history tracking
- Receipt generation
- Transaction status management

### 📊 Dashboard & Analytics
- Role-specific dashboards
- Property overview statistics
- Payment tracking
- Revenue reporting

## Technology Stack

### Backend
- **Node.js 22.x** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with Bootstrap 5
- **JavaScript (ES6+)** - Client-side functionality
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icons

## Installation

### Prerequisites
- Node.js 22.x or higher
- MongoDB (local or cloud instance)
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd property-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/property-management
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/tenants` - Get all tenants
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/password` - Change password
- `DELETE /api/users/:id` - Delete user (Admin only)

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get property by ID
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `POST /api/properties/:id/maintenance` - Add maintenance request

### Tenants
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get tenant by ID
- `PUT /api/tenants/:id` - Update tenant information
- `POST /api/tenants/:id/assign-property` - Assign tenant to property
- `POST /api/tenants/:id/remove-property` - Remove tenant from property
- `GET /api/tenants/:id/properties` - Get properties assigned to tenant

### Rent Schedules
- `GET /api/rent-schedules` - Get all rent schedules
- `GET /api/rent-schedules/:id` - Get rent schedule by ID
- `POST /api/rent-schedules` - Create new rent schedule
- `PUT /api/rent-schedules/:id` - Update rent schedule
- `DELETE /api/rent-schedules/:id` - Delete rent schedule
- `POST /api/rent-schedules/bulk` - Create multiple rent schedules

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create new payment
- `POST /api/payments/process-online` - Process online payment

## Role-Based Access Control

### 👨‍💼 Admin
- Full access to all features
- User management
- System configuration
- All property operations
- Financial reporting

### 🏠 Landlord
- Manage own properties
- View assigned tenants
- Create rent schedules
- Track payments
- Maintenance requests

### 🏠 Tenant
- View assigned properties
- Personal information management
- Payment history
- Maintenance requests
- Rent schedule viewing

## Database Schema

### User Model
```javascript
{
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  phone: String,
  role: String, // 'admin', 'landlord', 'tenant'
  isActive: Boolean,
  tenantInfo: {
    emergencyContact: Object,
    moveInDate: Date,
    leaseEndDate: Date
  },
  landlordInfo: {
    companyName: String,
    taxId: String,
    address: Object
  }
}
```

### Property Model
```javascript
{
  name: String,
  address: Object,
  propertyType: String,
  bedrooms: Number,
  bathrooms: Number,
  squareFootage: Number,
  monthlyRent: Number,
  securityDeposit: Number,
  landlord: ObjectId,
  currentTenant: ObjectId,
  status: String,
  amenities: Array,
  description: String,
  maintenanceHistory: Array
}
```

### RentSchedule Model
```javascript
{
  property: ObjectId,
  tenant: ObjectId,
  amount: Number,
  dueDate: Date,
  status: String,
  paymentMethod: String,
  lateFee: Number,
  recurring: Boolean,
  frequency: String
}
```

### Payment Model
```javascript
{
  rentSchedule: ObjectId,
  property: ObjectId,
  tenant: ObjectId,
  amount: Number,
  paymentDate: Date,
  paymentMethod: String,
  status: String,
  transactionId: String,
  receipt: String
}
```

## Deployment

### Azure App Service Deployment
This application is configured for Azure App Service deployment using GitHub Actions.

1. **Azure Configuration**
   - Create an Azure App Service
   - Configure environment variables in Azure
   - Set up MongoDB Atlas or Azure Cosmos DB

2. **GitHub Actions**
   - The workflow file `.github/workflows/main_pm.yml` is already configured
   - Push to main branch triggers automatic deployment

3. **Environment Variables for Production**
   ```env
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   ```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for password security
- **Input Validation** - Express-validator for data validation
- **CORS Protection** - Cross-origin resource sharing control
- **Helmet Security** - Security headers middleware
- **Rate Limiting** - API rate limiting protection
- **Role-Based Access** - Granular permission control

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.

## Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced reporting and analytics
- [ ] Mobile application
- [ ] Integration with payment gateways
- [ ] Document management system
- [ ] Maintenance scheduling
- [ ] Email notifications
- [ ] Multi-language support
