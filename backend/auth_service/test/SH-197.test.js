import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';

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

    it('should throw error if database emailVerificationRepo throws error (Catch check)', async () => {
      const mockEmail = { id: 'email-1', email: 'test@example.com', user_name: 'testuser' };
      emailVerificationRepoMock.findByUserEmailId.mockRejectedValue(new Error('DB Query Failed'));
      await expect(authService.sendVerificationEmail(mockEmail)).rejects.toThrow('DB Query Failed');
    });
  });

  describe('register', () => {
    it('should throw error if payload parameters are missing', async () => {
      await expect(authService.register({})).rejects.toThrow('Username, email and password are required');
    });

    it('should throw error if username is too short (< 3)', async () => {
      await expect(authService.register({ user_name: 'ab', email: 'a@a.com', password: 'Password@123' }))
        .rejects.toThrow('Username must be between 3 and 20 characters');
    });

    it('should throw error if username is too long (> 20)', async () => {
      await expect(authService.register({ user_name: 'a'.repeat(21), email: 'a@a.com', password: 'Password@123' }))
        .rejects.toThrow('Username must be between 3 and 20 characters');
    });

    it('should throw error if password is too short (< 8)', async () => {
      await expect(authService.register({ user_name: 'validuser', email: 'a@a.com', password: 'Short12' }))
        .rejects.toThrow('Password must be between 8 and 50 characters');
    });

    it('should throw error if password is too long (> 50)', async () => {
      await expect(authService.register({ user_name: 'validuser', email: 'a@a.com', password: 'a'.repeat(51) }))
        .rejects.toThrow('Password must be between 8 and 50 characters');
    });

    it('should throw error if username already exists', async () => {
      userRepoMock.findByUserName.mockResolvedValue({ id: '1' });
      await expect(authService.register({ user_name: 'taken', email: 'a@a.com', password: 'Password@123', display_name: '1' }))
        .rejects.toThrow('Username already exists');
    });

    it('should throw error if email format is invalid', async () => {
      await expect(authService.register({ user_name: 'free', email: 'invalid-email', password: 'Password@123', display_name: '1' }))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error if email already exists', async () => {
      userRepoMock.findByUserName.mockResolvedValue(null);
      userEmailRepoMock.findByEmail.mockResolvedValue({ id: '1' });
      await expect(authService.register({ user_name: 'free', email: 'taken@a.com', password: 'Password@123', display_name: '1' }))
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

    it('should throw error if database create user fails (Catch check)', async () => {
      userRepoMock.findByUserName.mockResolvedValue(null);
      userEmailRepoMock.findByEmail.mockResolvedValue(null);
      userRepoMock.create.mockRejectedValue(new Error('DB Insert Error'));

      await expect(authService.register({
        user_name: 'newuser',
        email: 'new@example.com',
        password: 'Password@123'
      })).rejects.toThrow('DB Insert Error');
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

    it('should throw error if database update in verifyEmail fails (Catch check)', async () => {
      emailVerificationRepoMock.findByHash.mockResolvedValue({
        id: 'verification-id',
        user_email_id: 'email-id',
        used_at: null,
        expires_at: new Date(Date.now() + 100000)
      });
      userEmailRepoMock.updateById.mockRejectedValue(new Error('DB Update Failed'));

      await expect(authService.verifyEmail('valid-token')).rejects.toThrow('DB Update Failed');
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

    it('should throw error and send verification email if email is not verified', async () => {
      const mockEmail = { id: 'email-1', email: 'unverified@example.com', user_id: 'user-1', is_verified: 0 };
      userEmailRepoMock.findByEmail.mockResolvedValue(mockEmail);
      emailVerificationRepoMock.findByUserEmailId.mockResolvedValue([]);

      await expect(authService.login({ email: 'unverified@example.com', password: 'password' }))
        .rejects.toThrow('Email not verified. A new verification email has been sent.');
    });

    it('should throw error if user associated with verified email is not found', async () => {
      const mockEmail = { id: 'email-1', email: 'verified@example.com', user_id: 'user-1', is_verified: 1 };
      userEmailRepoMock.findByEmail.mockResolvedValue(mockEmail);
      userRepoMock.findById.mockResolvedValue(null);

      await expect(authService.login({ email: 'verified@example.com', password: 'password' }))
        .rejects.toThrow('User associated with email not found');
    });

    it('should throw error if user is locked', async () => {
      const mockEmail = { id: 'email-1', email: 'verified@example.com', user_id: 'user-1', is_verified: 1 };
      userEmailRepoMock.findByEmail.mockResolvedValue(mockEmail);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', status: 'locked' });

      await expect(authService.login({ email: 'verified@example.com', password: 'password' }))
        .rejects.toThrow('User is locked');
    });

    it('should throw error if user is deleted', async () => {
      const mockEmail = { id: 'email-1', email: 'verified@example.com', user_id: 'user-1', is_verified: 1 };
      userEmailRepoMock.findByEmail.mockResolvedValue(mockEmail);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', status: 'deleted' });

      await expect(authService.login({ email: 'verified@example.com', password: 'password' }))
        .rejects.toThrow('User has been deleted');
    });

    it('should throw error if password incorrect', async () => {
      const mockEmail = { id: 'email-1', email: 'verified@example.com', user_id: 'user-1', is_verified: 1 };
      userEmailRepoMock.findByEmail.mockResolvedValue(mockEmail);
      const hashed_pwd = await bcrypt.hash('correctPassword', 10);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', status: 'active', password_hash: hashed_pwd });

      await expect(authService.login({ email: 'verified@example.com', password: 'wrongPassword' }))
        .rejects.toThrow('Password incorrect');
    });

    it('should login successfully by email', async () => {
      const mockEmail = { id: 'email-1', email: 'verified@example.com', user_id: 'user-1', is_verified: 1 };
      userEmailRepoMock.findByEmail.mockResolvedValue(mockEmail);
      const hashed_pwd = await bcrypt.hash('correctPassword', 10);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', status: 'active', password_hash: hashed_pwd, user_name: 'testuser' });
      userRoleRepoMock.findByUserId.mockResolvedValue([{ role_id: 'role-1' }]);
      roleRepoMock.findById.mockResolvedValue({ id: 'role-1', name: 'user' });

      const res = await authService.login({ email: 'verified@example.com', password: 'correctPassword' });
      expect(res.access_token).toBe('mock-access-token');
      expect(res.refresh_token).toBe('mock-refresh-token');
    });

    it('should login successfully by username', async () => {
      const hashed_pwd = await bcrypt.hash('correctPassword', 10);
      const mockUser = {
        id: 'user-1',
        user_name: 'testuser',
        status: 'active',
        password_hash: hashed_pwd,
        toJSON: () => ({ id: 'user-1' })
      };
      userRepoMock.findByUserName.mockResolvedValue(mockUser);
      
      const mockEmails = [
        { id: 'email-1', email: 'verified@example.com', is_verified: 1, toJSON: () => ({}) }
      ];
      userEmailRepoMock.getUserEmails.mockResolvedValue(mockEmails);
      userRoleRepoMock.findByUserId.mockResolvedValue([{ role_id: 'role-1' }]);
      roleRepoMock.findById.mockResolvedValue({ id: 'role-1', name: 'user' });

      const res = await authService.login({ user_name: 'testuser', password: 'correctPassword' });
      expect(res.access_token).toBe('mock-access-token');
    });

    it('should throw error and send verification email if logging by username has no verified email', async () => {
      const hashed_pwd = await bcrypt.hash('correctPassword', 10);
      const mockUser = {
        id: 'user-1',
        user_name: 'testuser',
        status: 'active',
        password_hash: hashed_pwd,
        toJSON: () => ({})
      };
      userRepoMock.findByUserName.mockResolvedValue(mockUser);

      const mockEmails = [
        { id: 'email-1', email: 'primary@example.com', is_verified: 0, toJSON: () => ({}) }
      ];
      userEmailRepoMock.getUserEmails.mockResolvedValue(mockEmails);
      emailVerificationRepoMock.findByUserEmailId.mockResolvedValue([]);

      await expect(authService.login({ user_name: 'testuser', password: 'correctPassword' }))
        .rejects.toThrow('No verified email found. A verification email has been sent to your primary email.');
    });

    it('should throw error if username not found', async () => {
      userRepoMock.findByUserName.mockResolvedValue(null);
      await expect(authService.login({ user_name: 'none', password: 'password' }))
        .rejects.toThrow('Username not found');
    });

    it('should throw error if database fails during login (Catch check)', async () => {
      userEmailRepoMock.findByEmail.mockRejectedValue(new Error('Database error'));
      await expect(authService.login({ email: 'test@test.com', password: 'password' }))
        .rejects.toThrow('Database error');
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

    it('should throw error if user associated with session not found', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue({ user_id: 'user-1', revoked_at: null });
      userRepoMock.findById.mockResolvedValue(null);
      await expect(authService.refreshToken('valid-token')).rejects.toThrow('User not found');
    });

    it('should refresh token successfully', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue({ user_id: 'user-1', revoked_at: null });
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', user_name: 'testuser' });

      const res = await authService.refreshToken('valid-token');
      expect(res.access_token).toBe('mock-access-token');
    });

    it('should throw error if database fails in refreshToken (Catch check)', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockRejectedValue(new Error('Session DB Error'));
      await expect(authService.refreshToken('valid-token')).rejects.toThrow('Session DB Error');
    });
  });

  describe('changePassword', () => {
    it('should throw error if missing parameters', async () => {
      await expect(authService.changePassword(null)).rejects.toThrow('Missing parameters');
      await expect(authService.changePassword('user-1', null, 'newpassword')).rejects.toThrow('Missing parameters');
    });

    it('should throw error if new password is too short (< 8)', async () => {
      await expect(authService.changePassword('user-1', 'old', 'short'))
        .rejects.toThrow('Password must be between 8 and 50 characters');
    });

    it('should throw error if new password is too long (> 50)', async () => {
      await expect(authService.changePassword('user-1', 'old', 'a'.repeat(51)))
        .rejects.toThrow('Password must be between 8 and 50 characters');
    });

    it('should throw error if user is not found', async () => {
      userRepoMock.findById.mockResolvedValue(null);
      await expect(authService.changePassword('user-1', 'oldpassword', 'newpassword123'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if old password is incorrect', async () => {
      const hashed = await bcrypt.hash('correctOld', 10);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', password_hash: hashed });

      await expect(authService.changePassword('user-1', 'wrongOld', 'newpassword123'))
        .rejects.toThrow('Old password incorrect');
    });

    it('should change password successfully', async () => {
      const hashed = await bcrypt.hash('correctOld', 10);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', password_hash: hashed });

      const res = await authService.changePassword('user-1', 'correctOld', 'newpassword123');
      expect(res).toBe(true);
      expect(userRepoMock.updateById).toHaveBeenCalled();
    });

    it('should throw error if database update fails in changePassword (Catch check)', async () => {
      const hashed = await bcrypt.hash('correctOld', 10);
      userRepoMock.findById.mockResolvedValue({ id: 'user-1', password_hash: hashed });
      userRepoMock.updateById.mockRejectedValue(new Error('DB Update Failed'));

      await expect(authService.changePassword('user-1', 'correctOld', 'newpassword123')).rejects.toThrow('DB Update Failed');
    });
  });

  describe('forgotPassword', () => {
    it('should throw error if email is missing', async () => {
      await expect(authService.forgotPassword(null)).rejects.toThrow('Email required');
    });

    it('should throw error if email is not found', async () => {
      userEmailRepoMock.findByEmail.mockResolvedValue(null);
      await expect(authService.forgotPassword('none@test.com')).rejects.toThrow('Email not found');
    });

    it('should generate password reset token successfully', async () => {
      userEmailRepoMock.findByEmail.mockResolvedValue({ user_id: 'user-1', email: 'test@test.com' });
      const token = await authService.forgotPassword('test@test.com');
      expect(token).toBeDefined();
      expect(passwordResetRepoMock.create).toHaveBeenCalled();
      expect(emailServiceMock.sendEmail).toHaveBeenCalled();
    });

    it('should throw error if database fails in forgotPassword (Catch check)', async () => {
      userEmailRepoMock.findByEmail.mockRejectedValue(new Error('Forgot DB Error'));
      await expect(authService.forgotPassword('test@test.com')).rejects.toThrow('Forgot DB Error');
    });
  });

  describe('resetPassword', () => {
    it('should throw error if parameters are missing', async () => {
      await expect(authService.resetPassword(null, 'newpass')).rejects.toThrow('Missing parameters');
      await expect(authService.resetPassword('token', null)).rejects.toThrow('Missing parameters');
    });

    it('should throw error if token is invalid or used', async () => {
      passwordResetRepoMock.findByHash.mockResolvedValue(null);
      await expect(authService.resetPassword('invalid', 'newpass123')).rejects.toThrow('Invalid or used token');
    });

    it('should throw error if token is already used', async () => {
      passwordResetRepoMock.findByHash.mockResolvedValue({ used_at: '2026-01-01' });
      await expect(authService.resetPassword('used', 'newpass123')).rejects.toThrow('Invalid or used token');
    });

    it('should reset password successfully', async () => {
      passwordResetRepoMock.findByHash.mockResolvedValue({ id: 'reset-1', user_id: 'user-1', used_at: null });
      const res = await authService.resetPassword('valid', 'newpass123');
      expect(res).toBe(true);
      expect(userRepoMock.updateById).toHaveBeenCalled();
      expect(passwordResetRepoMock.markUsed).toHaveBeenCalledWith('reset-1');
    });

    it('should throw error if database update fails in resetPassword (Catch check)', async () => {
      passwordResetRepoMock.findByHash.mockResolvedValue({ id: 'reset-1', user_id: 'user-1', used_at: null });
      userRepoMock.updateById.mockRejectedValue(new Error('Reset Update Failed'));
      await expect(authService.resetPassword('valid', 'newpass123')).rejects.toThrow('Reset Update Failed');
    });
  });

  describe('logout', () => {
    it('should throw error if session not found', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue(null);
      await expect(authService.logout('invalid')).rejects.toThrow('Invalid refresh token');
    });

    it('should logout successfully', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockResolvedValue({ id: 'session-1' });
      const res = await authService.logout('valid');
      expect(res).toBe(true);
      expect(sessionRepoMock.revokeSession).toHaveBeenCalledWith('session-1');
    });

    it('should throw error if database fails in logout (Catch check)', async () => {
      sessionRepoMock.findByRefreshTokenHash.mockRejectedValue(new Error('Logout DB Error'));
      await expect(authService.logout('valid')).rejects.toThrow('Logout DB Error');
    });
  });

  describe('getMe', () => {
    it('should call findById on userRepo', async () => {
      userRepoMock.findById.mockResolvedValue({ id: 'user-123' });
      const res = await authService.getMe('user-123');
      expect(userRepoMock.findById).toHaveBeenCalledWith('user-123');
      expect(res.id).toBe('user-123');
    });

    it('should throw error if findById in getMe throws error (Catch check)', async () => {
      userRepoMock.findById.mockRejectedValue(new Error('FindById failed'));
      await expect(authService.getMe('user-123')).rejects.toThrow('FindById failed');
    });
  });
});
