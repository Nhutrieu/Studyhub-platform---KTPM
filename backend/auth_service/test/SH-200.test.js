import { jest } from '@jest/globals';

const { AuthController } = await import('../src/controllers/AuthController.js');
const { AdminController } = await import('../src/controllers/AdminController.js');

describe('AuthController - Unit Test', () => {
  let authController;
  let authServiceMock;
  let resMock;

  beforeEach(() => {
    authServiceMock = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      changePassword: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      logout: jest.fn()
    };
    resMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    authController = new AuthController({ authService: authServiceMock });
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return 201 and user on success', async () => {
      const mockReq = { body: {}, headers: {}, ip: '127.0.0.1' };
      authServiceMock.register.mockResolvedValue({ user: { id: '1' }, verification_token: 'tok' });

      await authController.register(mockReq, resMock);

      expect(resMock.status).toHaveBeenCalledWith(201);
      expect(resMock.json).toHaveBeenCalledWith({ user: { id: '1' }, verificationToken: 'tok' });
    });

    it('should return 400 on failure', async () => {
      const mockReq = { body: {}, headers: {}, ip: '127.0.0.1' };
      authServiceMock.register.mockRejectedValue(new Error('Required'));

      await authController.register(mockReq, resMock);

      expect(resMock.status).toHaveBeenCalledWith(400);
      expect(resMock.json).toHaveBeenCalledWith({ error: 'Required' });
    });
  });

  describe('login', () => {
    it('should return token on success', async () => {
      const mockReq = { body: {}, headers: {}, ip: '127.0.0.1' };
      authServiceMock.login.mockResolvedValue({ user: { id: '1' }, access_token: 'at', refresh_token: 'rt' });

      await authController.login(mockReq, resMock);

      expect(resMock.json).toHaveBeenCalledWith({ user: { id: '1' }, access_token: 'at', refresh_token: 'rt' });
    });

    it('should return 401 on failure', async () => {
      const mockReq = { body: {}, headers: {}, ip: '127.0.0.1' };
      authServiceMock.login.mockRejectedValue(new Error('Incorrect'));

      await authController.login(mockReq, resMock);

      expect(resMock.status).toHaveBeenCalledWith(401);
    });
  });
});

describe('AdminController - Unit Test', () => {
  let adminController;
  let adminServiceMock;
  let resMock;

  beforeEach(() => {
    adminServiceMock = {
      listUsers: jest.fn(),
      countAccounts: jest.fn(),
      lockUser: jest.fn(),
      unlockUser: jest.fn(),
      isUserBlocked: jest.fn(),
      blockUserWithDuration: jest.fn(),
      permanentBlockUser: jest.fn(),
      unblockUser: jest.fn(),
      softDelete: jest.fn(),
      restoreUser: jest.fn(),
      updateRole: jest.fn(),
      getAuditLogs: jest.fn(),
      getAuditLogsByActor: jest.fn(),
      getAuditLogsByTarget: jest.fn()
    };
    resMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    adminController = new AdminController({ adminService: adminServiceMock });
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should list users', async () => {
      const mockReq = {};
      adminServiceMock.listUsers.mockResolvedValue([{ id: '1' }]);

      await adminController.listUsers(mockReq, resMock);

      expect(resMock.json).toHaveBeenCalledWith([{ id: '1' }]);
    });
  });
});
