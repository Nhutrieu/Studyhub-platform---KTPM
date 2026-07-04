import { jest } from '@jest/globals';
import supertest from 'supertest';

// 1. Mock database driver
jest.unstable_mockModule('mysql2/promise', () => ({
  default: {
    createPool: jest.fn(() => ({
      getConnection: jest.fn(async () => ({
        release: jest.fn()
      })),
      query: jest.fn(async () => [[]]),
      execute: jest.fn(async () => [[]])
    }))
  }
}));

// Mock external services to prevent side effects
jest.unstable_mockModule('../src/services/EmailService.js', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => ({
      sendEmail: jest.fn(async () => ({ messageId: 'mock' }))
    }))
  };
});

const mysql = await import('mysql2/promise');
const { createApp } = await import('../src/app.js');

describe('Router Integration Test (Auth Service) - SH-202', () => {
  let app;
  let request;

  beforeAll(() => {
    app = createApp();
    request = supertest(app);
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      // Just check health endpoint
      const response = await request.get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return validation error 401 if credentials missing', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({});
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
