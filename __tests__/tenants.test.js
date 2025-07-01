const request = require('supertest');
const app = require('../server');

describe('Tenants Endpoints', () => {
  describe('GET /api/tenants', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/tenants');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tenants/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/tenants/507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/tenants/:id/assign-property', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/tenants/507f1f77bcf86cd799439011/assign-property')
        .send({
          propertyId: '507f1f77bcf86cd799439012'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
}); 