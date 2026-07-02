import { jest } from '@jest/globals';

const { AdminService } = await import('../src/services/AdminService.js');

describe('AdminService - Unit Test', () => {
  let adminService;
  let userRepoMock;
  let userRoleRepoMock;
  let userBlockRepoMock;
  let userDeletionRepoMock;
  let auditRepoMock;
  let roleRepoMock;
  let rolePermissionRepoMock;
  let permissionRepoMock;
  let userEmailRepoMock;
  let emailTemplateRepoMock;

  beforeEach(() => {
    userRepoMock = {
      findAllForAdmin: jest.fn(),
      countByStatus: jest.fn(),
      updateById: jest.fn()
    };
    userRoleRepoMock = {
      assignRole: jest.fn()
    };
    userBlockRepoMock = {
      isUserBlocked: jest.fn(),
      blockUser: jest.fn(),
      liftAllBlocksByUser: jest.fn()
    };
    userDeletionRepoMock = {
      softDelete: jest.fn(),
      findByUserId: jest.fn(),
      updateById: jest.fn()
    };
    auditRepoMock = {
      logAction: jest.fn(),
      findAll: jest.fn(),
      findByActor: jest.fn(),
      findByTarget: jest.fn()
    };
    roleRepoMock = {
      findByName: jest.fn(),
      findById: jest.fn()
    };
    rolePermissionRepoMock = {
      assignPermission: jest.fn()
    };
    permissionRepoMock = {
      findByName: jest.fn()
    };
    userEmailRepoMock = {};
    emailTemplateRepoMock = {
      findAll: jest.fn()
    };

    adminService = new AdminService({
      userRepo: userRepoMock,
      userRoleRepo: userRoleRepoMock,
      userBlockRepo: userBlockRepoMock,
      userDeletionRepo: userDeletionRepoMock,
      auditRepo: auditRepoMock,
      roleRepo: roleRepoMock,
      rolePermissionRepo: rolePermissionRepoMock,
      permissionRepo: permissionRepoMock,
      userEmailRepo: userEmailRepoMock,
      emailTemplateRepo: emailTemplateRepoMock
    });

    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should call findAllForAdmin on userRepo', async () => {
      userRepoMock.findAllForAdmin.mockResolvedValue([{ id: '1' }]);
      const res = await adminService.listUsers();
      expect(userRepoMock.findAllForAdmin).toHaveBeenCalled();
      expect(res).toEqual([{ id: '1' }]);
    });
  });

  describe('countAccounts', () => {
    it('should count by status active, blocked, and deleted', async () => {
      userRepoMock.countByStatus.mockImplementation(async (status) => {
        if (status === 'active') return 10;
        if (status === 'blocked') return 2;
        if (status === 'deleted') return 1;
        return 0;
      });
      const res = await adminService.countAccounts();
      expect(res).toEqual({ active: 10, blocked: 2, deleted: 1 });
    });
  });

  describe('lockUser', () => {
    it('should throw error if parameters missing', async () => {
      await expect(adminService.lockUser(null, 'admin-1')).rejects.toThrow('Missing parameters');
    });

    it('should lock user successfully', async () => {
      const res = await adminService.lockUser('user-1', 'admin-1');
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'locked' });
      expect(auditRepoMock.logAction).toHaveBeenCalled();
      expect(res).toBe(true);
    });
  });

  describe('unlockUser', () => {
    it('should unlock user successfully', async () => {
      const res = await adminService.unlockUser('user-1', 'admin-1');
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'active' });
      expect(auditRepoMock.logAction).toHaveBeenCalled();
      expect(res).toBe(true);
    });
  });

  describe('isUserBlocked', () => {
    it('should throw error if user_id is missing', async () => {
      await expect(adminService.isUserBlocked(null)).rejects.toThrow('Missing user_id');
    });

    it('should return result from blockRepo', async () => {
      userBlockRepoMock.isUserBlocked.mockResolvedValue(true);
      const res = await adminService.isUserBlocked('user-1');
      expect(userBlockRepoMock.isUserBlocked).toHaveBeenCalledWith('user-1');
      expect(res).toBe(true);
    });
  });

  describe('permanentBlockUser', () => {
    it('should block user permanently and update status', async () => {
      const res = await adminService.permanentBlockUser('user-1', 'reason', 'admin-1');
      expect(userBlockRepoMock.blockUser).toHaveBeenCalled();
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'blocked' });
      expect(auditRepoMock.logAction).toHaveBeenCalled();
      expect(res).toBe(true);
    });
  });

  describe('unblockUser', () => {
    it('should lift block and update status', async () => {
      const res = await adminService.unblockUser('user-1', 'admin-1');
      expect(userBlockRepoMock.liftAllBlocksByUser).toHaveBeenCalledWith('user-1');
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'active' });
      expect(res).toBe(true);
    });
  });

  describe('blockUserWithDuration', () => {
    it('should throw error if parameters missing', async () => {
      await expect(adminService.blockUserWithDuration(null, 'reason', 'admin-1', new Date())).rejects.toThrow('Missing parameters');
    });

    it('should block user with duration', async () => {
      const blockedUntil = new Date();
      const res = await adminService.blockUserWithDuration('user-1', 'reason', 'admin-1', blockedUntil);
      expect(userBlockRepoMock.blockUser).toHaveBeenCalled();
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'blocked' });
      expect(res).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user successfully', async () => {
      const res = await adminService.softDelete('user-1', 'admin-1', 'reason');
      expect(userDeletionRepoMock.softDelete).toHaveBeenCalled();
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'deleted' });
      expect(res).toBe(true);
    });
  });

  describe('restoreUser', () => {
    it('should restore user and update deletions', async () => {
      userDeletionRepoMock.findByUserId.mockResolvedValue([{ id: 'del-1' }]);
      const res = await adminService.restoreUser('user-1', 'admin-1');
      expect(userDeletionRepoMock.updateById).toHaveBeenCalledWith('del-1', expect.any(Object));
      expect(userRepoMock.updateById).toHaveBeenCalledWith('user-1', { status: 'active' });
      expect(res).toBe(true);
    });
  });

  describe('updateRole', () => {
    it('should throw error if role not found', async () => {
      roleRepoMock.findByName.mockResolvedValue(null);
      await expect(adminService.updateRole('user-1', 'admin', 'admin-1')).rejects.toThrow('Role not found');
    });

    it('should assign role successfully', async () => {
      roleRepoMock.findByName.mockResolvedValue({ id: 'role-1' });
      const res = await adminService.updateRole('user-1', 'admin', 'admin-1');
      expect(userRoleRepoMock.assignRole).toHaveBeenCalled();
      expect(res).toBe(true);
    });
  });

  describe('addPermissionToRole', () => {
    it('should add permission to role successfully', async () => {
      roleRepoMock.findByName.mockResolvedValue({ id: 'role-1' });
      permissionRepoMock.findByName.mockResolvedValue({ id: 'perm-1' });
      const res = await adminService.addPermissionToRole('admin', 'read');
      expect(rolePermissionRepoMock.assignPermission).toHaveBeenCalled();
      expect(res).toBe(true);
    });
  });

  describe('getAuditLogs', () => {
    it('should fetch audit logs', async () => {
      auditRepoMock.findAll.mockResolvedValue([{ id: 'log-1' }]);
      const res = await adminService.getAuditLogs();
      expect(res).toEqual([{ id: 'log-1' }]);
    });
  });

  describe('getAuditLogsByActor', () => {
    it('should throw error if actor ID missing', async () => {
      await expect(adminService.getAuditLogsByActor(null)).rejects.toThrow('actorUserId required');
    });

    it('should return actor logs', async () => {
      auditRepoMock.findByActor.mockResolvedValue([{ id: 'log-1' }]);
      const res = await adminService.getAuditLogsByActor('actor-1');
      expect(res).toEqual([{ id: 'log-1' }]);
    });
  });

  describe('getAuditLogsByTarget', () => {
    it('should return target logs', async () => {
      auditRepoMock.findByTarget.mockResolvedValue([{ id: 'log-1' }]);
      const res = await adminService.getAuditLogsByTarget('target-1');
      expect(res).toEqual([{ id: 'log-1' }]);
    });
  });

  describe('listEmailTemplates', () => {
    it('should return all templates', async () => {
      emailTemplateRepoMock.findAll.mockResolvedValue([{ id: 'tpl-1' }]);
      const res = await adminService.listEmailTemplates();
      expect(res).toEqual([{ id: 'tpl-1' }]);
    });
  });
});
