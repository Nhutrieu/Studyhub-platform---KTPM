import { jest } from '@jest/globals';

// 1. Mock verifyAccessToken utility
jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  verifyAccessToken: jest.fn()
}));

const jwtUtils = await import('../src/utils/jwt.js');
const { verifyAccessToken } = await import('../src/middlewares/auth.js');
const { requireRole } = await import('../src/middlewares/role.js');

describe('Security Middlewares - Unit Test', () => {
  let reqMock;
  let resMock;
  let nextMock;

  beforeEach(() => {
    reqMock = {
      headers: {}
    };
    resMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextMock = jest.fn();
    jest.clearAllMocks();
  });

  describe('verifyAccessToken middleware', () => {
    it('should return 401 if Authorization header is missing', () => {
      verifyAccessToken(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith(401);
      expect(resMock.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header does not start with Bearer', () => {
      reqMock.headers.authorization = 'Basic credentials';

      verifyAccessToken(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith(401);
      expect(resMock.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should call next and append user if token is valid', () => {
      reqMock.headers.authorization = 'Bearer valid-token';
      jwtUtils.verifyAccessToken.mockReturnValue({ id: 'user-123', name: 'test' });

      verifyAccessToken(reqMock, resMock, nextMock);

      expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(reqMock.user).toEqual({ id: 'user-123', name: 'test' });
      expect(nextMock).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid or expired', () => {
      reqMock.headers.authorization = 'Bearer expired-token';
      jwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Expired');
      });

      verifyAccessToken(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith(401);
      expect(resMock.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });
  });

  describe('requireRole middleware', () => {
    it('should return 401 if req.user is missing', () => {
      const middleware = requireRole('admin');
      middleware(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith(401);
      expect(resMock.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 403 if user roles do not include required role', () => {
      reqMock.user = { role: ['user'] };
      const middleware = requireRole('admin');
      middleware(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith(403);
      expect(resMock.json).toHaveBeenCalledWith({ error: 'Forbidden: insufficient role' });
    });

    it('should call next if user roles include required role', () => {
      reqMock.user = { role: ['admin', 'user'] };
      const middleware = requireRole('admin');
      middleware(reqMock, resMock, nextMock);

      expect(nextMock).toHaveBeenCalled();
    });
  });
});
