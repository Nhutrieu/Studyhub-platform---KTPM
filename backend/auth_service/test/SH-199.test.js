import { jest } from '@jest/globals';

// 1. Mock utility modules and external dependencies
jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  signAccessToken: jest.fn(() => 'mock-oauth-access-token'),
  signRefreshToken: jest.fn(() => 'mock-oauth-refresh-token')
}));

jest.unstable_mockModule('../src/utils/tokenHash.js', () => ({
  createTokenHash: jest.fn((token) => `hash-${token}`)
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn(() => ({
      sendMail: jest.fn(async () => ({ messageId: 'mock-mail-id' }))
    }))
  }
}));

const nodemailer = await import('nodemailer');
const { OAuthService } = await import('../src/services/OAuthService.js');
const { EmailService } = await import('../src/services/EmailService.js');

describe('OAuthService - Unit Test', () => {
  let oAuthService;
  let oAuthProviderRepoMock;
  let oAuthAccountRepoMock;
  let userRepoMock;
  let userEmailRepoMock;
  let sessionRepoMock;
  let auditRepoMock;
  let userRoleRepoMock;
  let roleRepoMock;

  beforeEach(() => {
    oAuthProviderRepoMock = {
      findByName: jest.fn()
    };
    oAuthAccountRepoMock = {
      find: jest.fn(),
      linkAccount: jest.fn()
    };
    userRepoMock = {
      findById: jest.fn(),
      create: jest.fn()
    };
    userEmailRepoMock = {
      findByEmail: jest.fn(),
      create: jest.fn()
    };
    sessionRepoMock = {
      create: jest.fn()
    };
    auditRepoMock = {
      logAction: jest.fn()
    };
    userRoleRepoMock = {
      assignRole: jest.fn()
    };
    roleRepoMock = {
      findByName: jest.fn()
    };

    oAuthService = new OAuthService({
      oAuthProviderRepo: oAuthProviderRepoMock,
      oAuthAccountRepo: oAuthAccountRepoMock,
      userRepo: userRepoMock,
      userEmailRepo: userEmailRepoMock,
      sessionRepo: sessionRepoMock,
      auditRepo: auditRepoMock,
      userRoleRepo: userRoleRepoMock,
      roleRepo: roleRepoMock
    });

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should throw error if parameters are invalid', async () => {
      await expect(oAuthService.login(null, null)).rejects.toThrow('Invalid provider payload');
    });

    it('should throw error if provider is not supported', async () => {
      oAuthProviderRepoMock.findByName.mockResolvedValue(null);
      await expect(oAuthService.login('unknown', { id: '123' })).rejects.toThrow('Provider not supported');
    });

    it('should login existing linked account successfully', async () => {
      oAuthProviderRepoMock.findByName.mockResolvedValue({ id: '1', name: 'google' });
      oAuthAccountRepoMock.find.mockResolvedValue({ user_id: 'user-123' });
      userRepoMock.findById.mockResolvedValue({ id: 'user-123', user_name: 'existing' });

      const res = await oAuthService.login('google', { id: 'oauth-123' });

      expect(userRepoMock.findById).toHaveBeenCalledWith('user-123');
      expect(auditRepoMock.logAction).toHaveBeenCalled();
      expect(res.user_name).toBe('existing');
    });

    it('should create user and link OAuth account if new user', async () => {
      oAuthProviderRepoMock.findByName.mockResolvedValue({ id: '1', name: 'google' });
      oAuthAccountRepoMock.find.mockResolvedValue(null);
      userEmailRepoMock.findByEmail.mockResolvedValue(null);
      userRepoMock.create.mockResolvedValue({ id: 'user-new', user_name: 'new' });
      roleRepoMock.findByName.mockResolvedValue({ id: 'role-1' });

      const res = await oAuthService.login('google', { id: 'oauth-123', email: 'new@example.com' });

      expect(userRepoMock.create).toHaveBeenCalled();
      expect(userEmailRepoMock.create).toHaveBeenCalled();
      expect(oAuthAccountRepoMock.linkAccount).toHaveBeenCalled();
      expect(sessionRepoMock.create).toHaveBeenCalled();
      expect(res.user_name).toBe('new');
    });
  });
});

describe('EmailService - Unit Test', () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailService({
      user: 'test@example.com',
      clientId: '1',
      clientSecret: '2',
      redirectUri: '3',
      refreshToken: '4'
    });
  });

  describe('sendEmail', () => {
    it('should mock sendEmail or bypass under test mode', async () => {
      // With process.env.MOCK_EMAIL = 'true' which we set earlier
      process.env.MOCK_EMAIL = 'true';
      const res = await emailService.sendEmail({ to: 'test@example.com', subject: 'hello', html: 'world' });
      expect(res).toEqual({ messageId: 'mock-id' });
    });
  });
});
