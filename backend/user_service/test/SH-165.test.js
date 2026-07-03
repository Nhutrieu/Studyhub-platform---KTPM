import { jest } from '@jest/globals';
import { ProfileController } from '../src/controllers/ProfileController.js';

describe('ProfileController - Unit Test', () => {
  let controller;
  let profileServiceMock;
  let req;
  let res;

  beforeEach(() => {
    profileServiceMock = {
      getInfo: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateAvatar: jest.fn(),
      getPrivacy: jest.fn(),
      updatePrivacy: jest.fn(),
      searchUsers: jest.fn(),
      addSocialLink: jest.fn(),
      removeSocialLink: jest.fn(),
      addInterest: jest.fn(),
      removeInterest: jest.fn()
    };

    controller = new ProfileController({ profileService: profileServiceMock });

    req = {
      params: {},
      body: {},
      query: {},
      user: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getInfo', () => {
    it('should return profile info successfully', async () => {
      req.params.user_id = 'user-123';
      const mockProfile = { user: { id: 'user-123' } };
      profileServiceMock.getInfo.mockResolvedValue(mockProfile);

      await controller.getInfo(req, res);

      expect(profileServiceMock.getInfo).toHaveBeenCalledWith('user-123');
      expect(res.json).toHaveBeenCalledWith(mockProfile);
    });

    it('should return 400 status code on error', async () => {
      req.params.user_id = 'user-123';
      profileServiceMock.getInfo.mockRejectedValue(new Error('User not found'));

      await controller.getInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('getProfile', () => {
    it('should return public or owner profile successfully', async () => {
      req.params.user_id = 'user-123';
      req.user.id = 'viewer-456';
      const mockProfileResult = { isOwner: false, profile: {} };
      profileServiceMock.getProfile.mockResolvedValue(mockProfileResult);

      await controller.getProfile(req, res);

      expect(profileServiceMock.getProfile).toHaveBeenCalledWith({
        target_user_id: 'user-123',
        viewer_id: 'viewer-456'
      });
      expect(res.json).toHaveBeenCalledWith(mockProfileResult);
    });

    it('should return 403 status code on error', async () => {
      req.params.user_id = 'user-123';
      req.user.id = 'viewer-456';
      profileServiceMock.getProfile.mockRejectedValue(new Error('Private profile'));

      await controller.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Private profile' });
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      req.params.user_id = 'user-123';
      req.body = { display_name: 'test' };
      profileServiceMock.updateProfile.mockResolvedValue({ success: true });

      await controller.updateProfile(req, res);

      expect(profileServiceMock.updateProfile).toHaveBeenCalledWith('user-123', req.body);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 on error', async () => {
      req.params.user_id = 'user-123';
      profileServiceMock.updateProfile.mockRejectedValue(new Error('Validation error'));

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateAvatar', () => {
    // Note: since constructor wraps updateAvatar in middleware array [multer, handler], 
    // we test the handler method directly (controller.updateAvatar[1])
    let handler;
    beforeEach(() => {
      handler = controller.updateAvatar[1];
    });

    it('should return 400 if no file uploaded', async () => {
      req.file = null;

      await handler.call(controller, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No avatar file uploaded' });
    });

    it('should upload avatar successfully', async () => {
      req.params.user_id = 'user-123';
      req.file = { buffer: Buffer.from('image') };
      profileServiceMock.updateAvatar.mockResolvedValue({ avatar_url: 'url' });

      await handler.call(controller, req, res);

      expect(profileServiceMock.updateAvatar).toHaveBeenCalledWith('user-123', req.file.buffer);
      expect(res.json).toHaveBeenCalledWith({ avatar_url: 'url' });
    });

    it('should return 400 on service error', async () => {
      req.params.user_id = 'user-123';
      req.file = { buffer: Buffer.from('image') };
      profileServiceMock.updateAvatar.mockRejectedValue(new Error('Upload failed'));

      await handler.call(controller, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Upload failed' });
    });
  });

  describe('getPrivacy & updatePrivacy', () => {
    it('should get privacy successfully', async () => {
      req.params.user_id = 'user-123';
      profileServiceMock.getPrivacy.mockResolvedValue({ show_bio: 1 });

      await controller.getPrivacy(req, res);

      expect(profileServiceMock.getPrivacy).toHaveBeenCalledWith('user-123');
      expect(res.json).toHaveBeenCalledWith({ show_bio: 1 });
    });

    it('should return 400 if get privacy fails', async () => {
      req.params.user_id = 'user-123';
      profileServiceMock.getPrivacy.mockRejectedValue(new Error('DB Error'));

      await controller.getPrivacy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update privacy successfully', async () => {
      req.params.user_id = 'user-123';
      req.body = { show_bio: 0 };
      profileServiceMock.updatePrivacy.mockResolvedValue({ show_bio: 0 });

      await controller.updatePrivacy(req, res);

      expect(profileServiceMock.updatePrivacy).toHaveBeenCalledWith('user-123', req.body);
      expect(res.json).toHaveBeenCalledWith({ show_bio: 0 });
    });

    it('should return 400 if updating privacy fails', async () => {
      req.params.user_id = 'user-123';
      profileServiceMock.updatePrivacy.mockRejectedValue(new Error('Update failed'));

      await controller.updatePrivacy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Update failed' });
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      req.query = { query: 'test', limit: '5', offset: '0' };
      profileServiceMock.searchUsers.mockResolvedValue([]);

      await controller.searchUsers(req, res);

      expect(profileServiceMock.searchUsers).toHaveBeenCalledWith({
        keyword: 'test',
        limit: 5,
        offset: 0
      });
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 status code on exception', async () => {
      req.query = { query: 'test' };
      profileServiceMock.searchUsers.mockRejectedValue(new Error('Search crash'));

      await controller.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 400 for invalid pagination boundaries', async () => {
      req.query = { query: 'test', limit: '0', offset: '0' };

      await controller.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(profileServiceMock.searchUsers).not.toHaveBeenCalled();

      jest.clearAllMocks();
      req.query = { query: 'test', limit: '10', offset: '-1' };

      await controller.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(profileServiceMock.searchUsers).not.toHaveBeenCalled();
    });
  });

  describe('socialLinks & interests', () => {
    it('should add social link successfully', async () => {
      req.params.user_id = 'user-123';
      req.body.url = 'https://github.com';
      profileServiceMock.addSocialLink.mockResolvedValue({ id: 'link-1' });

      await controller.addSocialLink(req, res);

      expect(profileServiceMock.addSocialLink).toHaveBeenCalledWith('user-123', 'https://github.com', undefined);
      expect(res.json).toHaveBeenCalledWith({ id: 'link-1' });
    });

    it('should return 400 if adding social link fails', async () => {
      profileServiceMock.addSocialLink.mockRejectedValue(new Error('Invalid URL'));

      await controller.addSocialLink(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should remove social link successfully', async () => {
      req.params.id = 'link-1';
      profileServiceMock.removeSocialLink.mockResolvedValue(1);

      await controller.removeSocialLink(req, res);

      expect(profileServiceMock.removeSocialLink).toHaveBeenCalledWith('link-1');
      expect(res.json).toHaveBeenCalledWith({ success: 1 });
    });

    it('should return 400 if removing social link fails', async () => {
      req.params.id = 'link-1';
      profileServiceMock.removeSocialLink.mockRejectedValue(new Error('Delete failed'));

      await controller.removeSocialLink(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
    });

    it('should add interest successfully', async () => {
      req.params.user_id = 'user-123';
      req.body.interest = 'AI';
      profileServiceMock.addInterest.mockResolvedValue({ id: 'int-1' });

      await controller.addInterest(req, res);

      expect(profileServiceMock.addInterest).toHaveBeenCalledWith('user-123', 'AI');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 if adding interest fails', async () => {
      profileServiceMock.addInterest.mockRejectedValue(new Error('Add failed'));

      await controller.addInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Add failed' });
    });

    it('should remove interest successfully', async () => {
      req.params.user_id = 'user-123';
      req.body.interest = 'AI';
      profileServiceMock.removeInterest.mockResolvedValue(1);

      await controller.removeInterest(req, res);

      expect(profileServiceMock.removeInterest).toHaveBeenCalledWith('user-123', 'AI');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 if removing interest fails', async () => {
      profileServiceMock.removeInterest.mockRejectedValue(new Error('Remove failed'));

      await controller.removeInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Remove failed' });
    });
  });
});
