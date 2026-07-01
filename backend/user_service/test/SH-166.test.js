import { jest } from '@jest/globals';

// Mock the jwt utils module before importing the middleware
jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  verifyAccessToken: jest.fn()
}));

const jwtUtils = await import('../src/utils/jwt.js');
const { verifyAccessToken } = await import('../src/middlewares/auth.js');

describe('Auth Middleware - verifyAccessToken', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if Authorization header is missing', () => {
    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header does not start with Bearer', () => {
    req.headers.authorization = 'Basic credentials';

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', () => {
    req.headers.authorization = 'Bearer invalid_token';
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach payload to req.user and call next if token is valid', () => {
    req.headers.authorization = 'Bearer valid_token';
    const mockPayload = { id: 'user-123', name: 'user1' };
    jwtUtils.verifyAccessToken.mockReturnValue(mockPayload);

    verifyAccessToken(req, res, next);

    expect(req.user).toEqual(mockPayload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
