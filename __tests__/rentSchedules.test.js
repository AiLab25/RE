const request = require('supertest');
const app = require('../server');

describe('Rent Schedules Endpoints', () => {
  describe('GET /api/rent-schedules', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/rent-schedules');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/rent-schedules', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/rent-schedules')
        .send({
          property: '507f1f77bcf86cd799439011',
          tenant: '507f1f77bcf86cd799439012',
          amount: 1000,
          dueDate: '2024-01-01',
          paymentMethod: 'online'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
}); 