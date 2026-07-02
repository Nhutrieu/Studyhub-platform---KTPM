import { jest } from '@jest/globals';

// 1. Mock utility modules
jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn()
}));

jest.unstable_mockModule('../src/utils/tokenHash.js', () => ({
  createTokenHash: jest.fn((token) => `hash-${token}`),
  generateRandomToken: jest.fn(() => 'mock-random-token')
}));

const jwtUtils = await import('../src/utils/jwt.js');
const tokenHashUtils = await import('../src/utils/tokenHash.js');
const { AuthService } = await import('../src/services/AuthService.js');

describe('AuthService - Unit Test', () => {
  let authService;
  let userRepoMock;
  let userEmailRepoMock;
  let sessionRepoMock;
  let passwordResetRepoMock;
  let emailVerificationRepoMock;
  let auditRepoMock;
  let userRoleRepoMock;
  let roleRepoMock;
  let outboxRepoMock;
  let emailServiceMock;

  beforeEach(() => {
    userRepoMock = {
      findById: jest.fn(),
      findByUserName: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn()
    };
    userEmailRepoMock = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      updateById: jest.fn(),
      getUserEmails: jest.fn()
    };
    sessionRepoMock = {
      create: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      revokeSession: jest.fn()
    };
    passwordResetRepoMock = {
      create: jest.fn(),
      findByHash: jest.fn(),
      markUsed: jest.fn()
    };
    emailVerificationRepoMock = {
      findByUserEmailId: jest.fn(),
      createToken: jest.fn(),
      deleteToken: jest.fn(),
      findByHash: jest.fn(),
      markUsed: jest.fn()
    };
    auditRepoMock = {
      logAction: jest.fn()
    };
    userRoleRepoMock = {
      assignRole: jest.fn(),
      findByUserId: jest.fn()
    };
    roleRepoMock = {
      findByName: jest.fn(),
      findById: jest.fn()
    };
    outboxRepoMock = {
      insertEvent: jest.fn()
    };
    emailServiceMock = {
      sendEmail: jest.fn()
    };

    authService = new AuthService({
      userRepo: userRepoMock,
      userEmailRepo: userEmailRepoMock,
      sessionRepo: sessionRepoMock,
      passwordResetRepo: passwordResetRepoMock,
      emailVerificationRepo: emailVerificationRepoMock,
      auditRepo: auditRepoMock,
      userRoleRepo: userRoleRepoMock,
      roleRepo: roleRepoMock,
      outboxRepo: outboxRepoMock,
      emailService: emailServiceMock
    });

    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should throw error if userEmail is not provided', async () => {
      await expect(authService.sendVerificationEmail(null)).rejects.toThrow('User email required');
    });

    it('should delete existing unused verification tokens and create a new one', async () => {
      const mockEmail = { id: 'email-1', email: 'test@example.com', user_name: 'testuser' };
      const mockTokens = [{ id: 'token-1', used_at: null }, { id: 'token-2', used_at: '2026-01-01' }];
      emailVerificationRepoMock.findByUserEmailId.mockResolvedValue(mockTokens);

      const token = await authService.sendVerificationEmail(mockEmail);

      expect(emailVerificationRepoMock.findByUserEmailId).toHaveBeenCalledWith('email-1');
      expect(emailVerificationRepoMock.deleteToken).toHaveBeenCalledWith('token-1');
      expect(emailVerificationRepoMock.deleteToken).not.toHaveBeenCalledWith('token-2');
      expect(emailVerificationRepoMock.createToken).toHaveBeenCalled();
      expect(emailServiceMock.sendEmail).toHaveBeenCalled();
      expect(token).toBeDefined();
    });
  });

  describe('register', () => {
    it('should throw error if payload parameters are missing', async () => {
      await expect(authService.register({})).rejects.toThrow('Username, email, display name and password are required');
    });

    it('should throw error if username already exists', async () => {
      userRepoMock.findByUserName.mockResolvedValue({ id: '1' });
      await expect(authService.register({ user_name: 'taken', email: 'a@a.com', password: '1', display_name: '1' }))
        .rejects.toThrow('Username already exists');
    });

    it('should throw error if email format is invalid', async () => {
      await expect(authService.register({ user_name: 'free', email: 'invalid-email', password: '1', display_name: '1' }))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error if email already exists', async () => {
      userRepoMock.findByUserName.mockResolvedValue(null);
      userEmailRepoMock.findByEmail.mockResolvedValue({ id: '1' });
      await expect(authService.register({ user_name: 'free', email: 'taken@a.com', password: '1', display_name: '1' }))
        .rejects.toThrow('Email already exists');
    });

    it('should register successfully and assign default user role', async () => {
      userRepoMock.findByUserName.mockResolvedValue(null);
      userEmailRepoMock.findByEmail.mockResolvedValue(null);
      userRepoMock.create.mockResolvedValue({ id: 'user-id-123', user_name: 'newuser', created_at: new Date() });
      userEmailRepoMock.create.mockResolvedValue({ id: 'email-id-123', email: 'new@example.com' });
      emailVerificationRepoMock.findByUserEmailId.mockResolvedValue([]);
      roleRepoMock.findByName.mockResolvedValue({ id: 'role-id-user', name: 'user' });

      const res = await authService.register({
        user_name: 'newuser',
        email: 'new@example.com',
        password: 'Password@123',
        display_name: 'New User'
      });

      expect(userRepoMock.create).toHaveBeenCalled();
      expect(userEmailRepoMock.create).toHaveBeenCalled();
      expect(userRoleRepoMock.assignRole).toHaveBeenCalled();
      expect(outboxRepoMock.insertEvent).toHaveBeenCalled();
      expect(res.user.user_name).toBe('newuser');
    });
  });

  describe('verifyEmail', () => {
    it('should throw error if token is missing', async () => {
      await expect(authService.verifyEmail(null)).rejects.toThrow('Token required');
    });

    it('should throw error if token is not found in database', async () => {
      emailVerificationRepoMock.findByHash.mockResolvedValue(null);
      await expect(authService.verifyEmail('invalid')).rejects.toThrow('Invalid token');
    });

    it('should throw error if token has already been used', async () => {
      emailVerificationRepoMock.findByHash.mockResolvedValue({ used_at: '2026-01-01' });
      await expect(authService.verifyEmail('used')).rejects.toThrow('Token already used');
    });

    it('should throw error if token has expired', async () => {
      emailVerificationRepoMock.findByHash.mockResolvedValue({
        used_at: null,
        expires_at: new Date(Date.now() - 1000) // past
      });
      await expect(authService.verifyEmail('expired')).rejects.toThrow('Token expired');
    });

    it('should verify email successfully', async () => {
      emailVerificationRepoMock.findByHash.mockResolvedValue({
        id: 'verification-id',
        user_email_id: 'email-id',
        used_at: null,
        expires_at: new Date(Date.now() + 100000)
      });
      userEmailRepoMock.findById.mockResolvedValue({ user_id: 'user-123' });

      const res = await authService.verifyEmail('valid-token');

      expect(userEmailRepoMock.updateById).toHaveBeenCalledWith('email-id', { is_verified: 1 });
      expect(emailVerificationRepoMock.markUsed).toHaveBeenCalledWith('verification-id');
      expect(res).toBe(true);
    });
  });

  describe('login', () => {
    it('should throw error if missing credentials', async () => {
      await expect(authService.login({ password: '' })).rejects.toThrow('Email or username and password required');
    });

    it('should throw error if login by email and email not found', async () => {
      userEmailRepoMock.findByEmail.mockResolvedValue(null);
      await expect(authService.login({ email: 'none@example.com', password: '1' })).rejects.toThrow('Email not found');
    });
  });

  describe('refreshToken', () => {
    it('should throw error if refresh token is missing', async () => {
      await expect(authService.refreshToken(null)).rejects.toThrow('Refresh token required');
    });

    it('should throw error if session is not found', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue(null);
      await expect(authService.refreshToken('non-existent')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if session is revoked', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue({ revoked_at: '2026-01-01' });
      await expect(authService.refreshToken('revoked')).rejects.toThrow('Refresh token revoked');
    });
  });

  describe('changePassword', () => {
    it('should throw error if missing parameters', async () => {
      await expect(authService.changePassword(null)).rejects.toThrow('Missing parameters');
    });
  });

  describe('forgotPassword', () => {
    it('should throw error if email is missing', async () => {
      await expect(authService.forgotPassword(null)).rejects.toThrow('Email required');
    });
  });

  describe('resetPassword', () => {
    it('should throw error if parameters are missing', async () => {
      await expect(authService.resetPassword(null)).rejects.toThrow('Missing parameters');
    });
  });

  describe('logout', () => {
    it('should throw error if session not found', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue(null);
      await expect(authService.logout('invalid')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getMe', () => {
    it('should call findById on userRepo', async () => {
      userRepoMock.findById.mockResolvedValue({ id: 'user-123' });
      const res = await authService.getMe('user-123');
      expect(userRepoMock.findById).toHaveBeenCalledWith('user-123');
      expect(res.id).toBe('user-123');
    });
  });
});
