import { jest } from '@jest/globals';

// Mock the jwt utils module before importing the middleware
jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  verifyAccessToken: jest.fn()
}));

const jwtUtils = await import('../src/utils/jwt.js');
const { verifyAccessToken } = await import('../src/middlewares/auth.js');
const { FollowService } = await import('../src/services/FollowService.js');

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

describe('FollowService - Unit Test', () => {
  let followRepoMock;
  let userRepoMock;
  let followService;

  beforeEach(() => {
    followRepoMock = {
      follow: jest.fn(),
      unfollow: jest.fn(),
      findByFollowerAndTarget: jest.fn(),
      getFollowCounts: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getFriends: jest.fn()
    };
    userRepoMock = {
      findById: jest.fn().mockResolvedValue({ id: 'user' })
    };
    followService = new FollowService({
      followRepo: followRepoMock,
      userRepo: userRepoMock
    });

    jest.clearAllMocks();
  });

  it('should reject following self', async () => {
    await expect(followService.follow('user-123', 'user-123')).rejects.toThrow('Cannot follow self');
    expect(followRepoMock.follow).not.toHaveBeenCalled();
  });

  it('should reject follow when target user is not found', async () => {
    userRepoMock.findById.mockImplementation((id) =>
      Promise.resolve(id === 'missing-user' ? null : { id })
    );

    await expect(followService.follow('user-123', 'missing-user')).rejects.toThrow('User not found');
    expect(followRepoMock.follow).not.toHaveBeenCalled();
  });

  it('should reject duplicate follow', async () => {
    followRepoMock.findByFollowerAndTarget.mockResolvedValue({
      follower_id: 'user-123',
      target_user_id: 'user-456'
    });

    await expect(followService.follow('user-123', 'user-456')).rejects.toThrow('Already following this user');
    expect(followRepoMock.follow).not.toHaveBeenCalled();
  });

  it('should follow a valid target user', async () => {
    followRepoMock.findByFollowerAndTarget.mockResolvedValue(null);
    followRepoMock.follow.mockResolvedValue({
      follower_id: 'user-123',
      target_user_id: 'user-456'
    });

    const result = await followService.follow('user-123', 'user-456');

    expect(followRepoMock.follow).toHaveBeenCalledWith('user-123', 'user-456');
    expect(result).toEqual({
      follower_id: 'user-123',
      target_user_id: 'user-456'
    });
  });

  it('should reject unfollow when relationship does not exist', async () => {
    followRepoMock.findByFollowerAndTarget.mockResolvedValue(null);

    await expect(followService.unfollow('user-123', 'user-456')).rejects.toThrow('Follow relationship not found');
    expect(followRepoMock.unfollow).not.toHaveBeenCalled();
  });
});
