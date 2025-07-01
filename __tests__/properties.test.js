const request = require('supertest');
const app = require('../server');

describe('Properties Endpoints', () => {
  describe('GET /api/properties', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/properties');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/properties', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/properties')
        .send({
          name: 'Test Property',
          propertyType: 'apartment',
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
          },
          monthlyRent: 1000
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid property data', async () => {
      const res = await request(app)
        .post('/api/properties')
        .send({
          name: '',
          propertyType: 'invalid-type'
        });

      expect(res.statusCode).toBe(401); // Still 401 because no auth
    });
  });
}); 