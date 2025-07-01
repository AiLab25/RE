const request = require('supertest');
const app = require('../server');

describe('Users Endpoints', () => {
  describe('GET /api/users', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/tenants', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/users/tenants');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
}); 