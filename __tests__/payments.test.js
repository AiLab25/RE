const request = require('supertest');
const app = require('../server');

describe('Payments Endpoints', () => {
  describe('GET /api/payments', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/payments');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/payments', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/payments')
        .send({
          rentSchedule: '507f1f77bcf86cd799439011',
          amount: 1000,
          paymentMethod: 'online'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
}); 