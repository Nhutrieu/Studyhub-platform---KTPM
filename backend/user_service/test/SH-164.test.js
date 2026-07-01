import { jest } from '@jest/globals';

// 1. Mock file-type and cloudinary utils
jest.unstable_mockModule('file-type', () => ({
  fileTypeFromBuffer: jest.fn()
}));
jest.unstable_mockModule('../src/utils/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn()
}));

const fileType = await import('file-type');
const cloudinary = await import('../src/utils/cloudinary.js');
const { ProfileService } = await import('../src/services/ProfileService.js');

describe('ProfileService - Unit Test', () => {
  let profileService;
  let userRepoMock;
  let profileRepoMock;
  let privacyRepoMock;
  let socialRepoMock;
  let interestsRepoMock;

  beforeEach(() => {
    userRepoMock = {
      findById: jest.fn(),
      updateUserById: jest.fn(),
      searchByKeyword: jest.fn()
    };
    profileRepoMock = {
      findOwnerProfile: jest.fn(),
      findPublicProfile: jest.fn(),
      upsert: jest.fn()
    };
    privacyRepoMock = {
      findByUserId: jest.fn(),
      upsert: jest.fn()
    };
    socialRepoMock = {
      findByUserAndPlatform: jest.fn(),
      updateLink: jest.fn(),
      createLink: jest.fn(),
      deleteLink: jest.fn()
    };
    interestsRepoMock = {
      addInterest: jest.fn(),
      removeInterest: jest.fn()
    };

    profileService = new ProfileService({
      userRepo: userRepoMock,
      profileRepo: profileRepoMock,
      privacyRepo: privacyRepoMock,
      socialRepo: socialRepoMock,
      interestsRepo: interestsRepoMock
    });

    jest.clearAllMocks();
  });

  describe('getInfo', () => {
    it('should return user info if found', async () => {
      const mockUser = { id: 'user-123', display_name: 'user1' };
      userRepoMock.findById.mockResolvedValue(mockUser);

      const result = await profileService.getInfo('user-123');

      expect(userRepoMock.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ user: mockUser });
    });

    it('should throw an error if user is not found', async () => {
      userRepoMock.findById.mockResolvedValue(null);

      await expect(profileService.getInfo('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('getProfile', () => {
    it('should return owner profile details if viewer is the owner', async () => {
      const mockProfile = { user_id: 'user-123', bio: 'Owner bio' };
      profileRepoMock.findOwnerProfile.mockResolvedValue(mockProfile);

      const result = await profileService.getProfile({ target_user_id: 'user-123', viewer_id: 'user-123' });

      expect(profileRepoMock.findOwnerProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ isOwner: true, profile: mockProfile });
    });

    it('should throw an error if owner profile is not found', async () => {
      profileRepoMock.findOwnerProfile.mockResolvedValue(null);

      await expect(profileService.getProfile({ target_user_id: 'user-123', viewer_id: 'user-123' })).rejects.toThrow('User not found');
    });

    it('should return public profile details if viewer is not the owner', async () => {
      const mockProfile = { user_id: 'user-123', bio: 'Public bio' };
      profileRepoMock.findPublicProfile.mockResolvedValue(mockProfile);

      const result = await profileService.getProfile({ target_user_id: 'user-123', viewer_id: 'viewer-456' });

      expect(profileRepoMock.findPublicProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ isOwner: false, profile: mockProfile });
    });

    it('should throw an error if profile is private or not found', async () => {
      profileRepoMock.findPublicProfile.mockResolvedValue(null);

      await expect(profileService.getProfile({ target_user_id: 'user-123', viewer_id: 'viewer-456' })).rejects.toThrow('Profile is private or not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user and details successfully', async () => {
      const updateData = { display_name: 'New Name', bio: 'New Bio' };
      const updatedUser = { id: 'user-123', display_name: 'New Name' };
      const updatedDetails = { user_id: 'user-123', bio: 'New Bio' };

      userRepoMock.updateUserById.mockResolvedValue(updatedUser);
      profileRepoMock.upsert.mockResolvedValue(updatedDetails);

      const result = await profileService.updateProfile('user-123', updateData);

      expect(userRepoMock.updateUserById).toHaveBeenCalledWith('user-123', {
        display_name: 'New Name',
        full_name: undefined
      });
      expect(profileRepoMock.upsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        bio: 'New Bio',
        gender: undefined,
        birthday: undefined,
        country: undefined,
        city: undefined
      });
      expect(result).toEqual({ user: updatedUser, details: updatedDetails });
    });
  });

  describe('updateAvatar', () => {
    it('should throw an error if file is missing', async () => {
      await expect(profileService.updateAvatar('user-123', null)).rejects.toThrow('No avatar file uploaded');
    });

    it('should throw an error if file extension is not allowed', async () => {
      const mockFile = { buffer: Buffer.from('hello') };
      fileType.fileTypeFromBuffer.mockResolvedValue({ ext: 'txt' });

      await expect(profileService.updateAvatar('user-123', mockFile)).rejects.toThrow('Uploaded file is not a valid image.');
    });

    it('should throw an error if user is not found', async () => {
      const mockFile = { buffer: Buffer.from('hello') };
      fileType.fileTypeFromBuffer.mockResolvedValue({ ext: 'png' });
      userRepoMock.findById.mockResolvedValue(null);

      await expect(profileService.updateAvatar('user-123', mockFile)).rejects.toThrow('User not found');
    });

    it('should upload to Cloudinary and update user avatar_url successfully', async () => {
      const mockFile = { buffer: Buffer.from('hello') };
      fileType.fileTypeFromBuffer.mockResolvedValue({ ext: 'png' });
      userRepoMock.findById.mockResolvedValue({ id: 'user-123' });
      cloudinary.uploadToCloudinary.mockResolvedValue({ secure_url: 'https://cloudinary.com/avatar.png' });
      userRepoMock.updateUserById.mockResolvedValue({ id: 'user-123', avatar_url: 'https://cloudinary.com/avatar.png' });

      const result = await profileService.updateAvatar('user-123', mockFile);

      expect(cloudinary.uploadToCloudinary).toHaveBeenCalled();
      expect(userRepoMock.updateUserById).toHaveBeenCalledWith('user-123', {
        avatar_url: 'https://cloudinary.com/avatar.png'
      });
      expect(result).toEqual({ id: 'user-123', avatar_url: 'https://cloudinary.com/avatar.png' });
    });
  });

  describe('getPrivacy & updatePrivacy', () => {
    it('should return privacy settings', async () => {
      const mockPrivacy = { user_id: 'user-123', show_bio: 1 };
      privacyRepoMock.findByUserId.mockResolvedValue(mockPrivacy);

      const result = await profileService.getPrivacy('user-123');

      expect(privacyRepoMock.findByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPrivacy);
    });

    it('should update privacy settings successfully', async () => {
      const mockPrivacy = { user_id: 'user-123', show_bio: 0 };
      privacyRepoMock.upsert.mockResolvedValue(mockPrivacy);

      const result = await profileService.updatePrivacy('user-123', { show_bio: 0 });

      expect(privacyRepoMock.upsert).toHaveBeenCalledWith({ user_id: 'user-123', show_bio: 0 });
      expect(result).toEqual(mockPrivacy);
    });
  });

  describe('searchUsers', () => {
    it('should return mapping of users if found', async () => {
      const mockRows = [{
        user_id: 'user-123',
        display_name: 'user1',
        full_name: 'User One',
        avatar_url: 'http://avatar',
        status: 'online',
        country: 'Vietnam'
      }];
      userRepoMock.searchByKeyword.mockResolvedValue(mockRows);

      const result = await profileService.searchUsers({ keyword: 'user1' });

      expect(userRepoMock.searchByKeyword).toHaveBeenCalledWith('user1', 5, 0);
      expect(result).toEqual([{
        id: 'user-123',
        display_name: 'user1',
        full_name: 'User One',
        avatar_url: 'http://avatar',
        status: 'online',
        country: 'Vietnam',
        city: undefined,
        bio: undefined,
        gender: undefined,
        birthday: undefined
      }]);
    });

    it('should return empty array if no users matched', async () => {
      userRepoMock.searchByKeyword.mockResolvedValue([]);

      const result = await profileService.searchUsers({ keyword: 'non-existent' });

      expect(result).toEqual([]);
    });
  });

  describe('socialLinks & interests', () => {
    it('should throw an error when adding social link with no URL', async () => {
      await expect(profileService.addSocialLink('user-123', '')).rejects.toThrow('Social link URL is required');
    });

    it('should throw an error when adding social link with invalid URL format', async () => {
      await expect(profileService.addSocialLink('user-123', 'not_a_url')).rejects.toThrow('Invalid URL format');
    });

    it('should throw an error when adding social link with unsupported platform', async () => {
      await expect(profileService.addSocialLink('user-123', 'https://unknown-platform.com/user')).rejects.toThrow('Unsupported social media platform');
    });

    it('should create new social link if it does not exist', async () => {
      socialRepoMock.findByUserAndPlatform.mockResolvedValue(null);
      socialRepoMock.createLink.mockResolvedValue({ id: 'link-123' });

      const result = await profileService.addSocialLink('user-123', 'https://github.com/user1');

      expect(socialRepoMock.findByUserAndPlatform).toHaveBeenCalledWith('user-123', 'github');
      expect(socialRepoMock.createLink).toHaveBeenCalled();
      expect(result).toEqual({ id: 'link-123' });
    });

    it('should update social link if already exists', async () => {
      const existingLink = { id: 'link-123', platform: 'github', url: 'https://github.com/old' };
      socialRepoMock.findByUserAndPlatform.mockResolvedValue(existingLink);
      socialRepoMock.updateLink.mockResolvedValue({ id: 'link-123', url: 'https://github.com/new' });

      const result = await profileService.addSocialLink('user-123', 'https://github.com/new');

      expect(socialRepoMock.updateLink).toHaveBeenCalledWith('link-123', { url: 'https://github.com/new' });
      expect(result).toEqual({ id: 'link-123', url: 'https://github.com/new' });
    });

    it('should remove social link successfully', async () => {
      socialRepoMock.deleteLink.mockResolvedValue(1);

      const result = await profileService.removeSocialLink('link-123');

      expect(socialRepoMock.deleteLink).toHaveBeenCalledWith('link-123');
      expect(result).toBe(1);
    });

    it('should add interest successfully', async () => {
      interestsRepoMock.addInterest.mockResolvedValue({ id: 'interest-123', interest: 'Coding' });

      const result = await profileService.addInterest('user-123', 'Coding');

      expect(interestsRepoMock.addInterest).toHaveBeenCalled();
      expect(result).toEqual({ id: 'interest-123', interest: 'Coding' });
    });

    it('should remove interest successfully', async () => {
      interestsRepoMock.removeInterest.mockResolvedValue(1);

      const result = await profileService.removeInterest('user-123', 'Coding');

      expect(interestsRepoMock.removeInterest).toHaveBeenCalledWith('user-123', 'Coding');
      expect(result).toBe(1);
    });
  });
});
