import express from 'express';
import supertest from 'supertest';
import { jest } from '@jest/globals';

// Mock auth middleware
jest.unstable_mockModule('../src/middlewares/auth.js', () => ({
  verifyAccessToken: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  }
}));

const { createProfileRouter } = await import('../src/routes/profileRouter.js');

describe('Profile Router Integration Test', () => {
  let app;
  let profileServiceMock;

  beforeEach(() => {
    profileServiceMock = {
      searchUsers: jest.fn(),
      getInfo: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateAvatar: jest.fn(),
      getPrivacy: jest.fn(),
      updatePrivacy: jest.fn(),
      addSocialLink: jest.fn(),
      removeSocialLink: jest.fn(),
      addInterest: jest.fn(),
      removeInterest: jest.fn(),
    };

    app = express();
    app.use(express.json());
    app.use('/profile', createProfileRouter({ profileService: profileServiceMock }));
  });

  it('GET /search', async () => {
    profileServiceMock.searchUsers.mockResolvedValue([]);
    const res = await supertest(app).get('/profile/search?query=test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /:user_id', async () => {
    profileServiceMock.getInfo.mockResolvedValue({ user: { id: 'user-123' } });
    const res = await supertest(app).get('/profile/user-123');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-123');
  });

  it('GET /detail/:user_id', async () => {
    profileServiceMock.getProfile.mockResolvedValue({ isOwner: true });
    const res = await supertest(app).get('/profile/detail/user-123');
    expect(res.status).toBe(200);
  });

  it('PUT /:user_id', async () => {
    profileServiceMock.updateProfile.mockResolvedValue({ success: true });
    const res = await supertest(app).put('/profile/user-123').send({ display_name: 'new' });
    expect(res.status).toBe(200);
  });

  it('GET /:user_id/privacy', async () => {
    profileServiceMock.getPrivacy.mockResolvedValue({ show_bio: 1 });
    const res = await supertest(app).get('/profile/user-123/privacy');
    expect(res.status).toBe(200);
  });

  it('PUT /:user_id/privacy', async () => {
    profileServiceMock.updatePrivacy.mockResolvedValue({ show_bio: 0 });
    const res = await supertest(app).put('/profile/user-123/privacy').send({ show_bio: 0 });
    expect(res.status).toBe(200);
  });

  it('POST /:user_id/social', async () => {
    profileServiceMock.addSocialLink.mockResolvedValue({ id: 'link-1' });
    const res = await supertest(app).post('/profile/user-123/social').send({ url: 'https://github.com' });
    expect(res.status).toBe(200);
  });

  it('DELETE /social/:id', async () => {
    profileServiceMock.removeSocialLink.mockResolvedValue(1);
    const res = await supertest(app).delete('/profile/social/link-1');
    expect(res.status).toBe(200);
  });

  it('POST /:user_id/interest', async () => {
    profileServiceMock.addInterest.mockResolvedValue({ success: true });
    const res = await supertest(app).post('/profile/user-123/interest').send({ interest: 'AI' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:user_id/interest', async () => {
    profileServiceMock.removeInterest.mockResolvedValue(1);
    const res = await supertest(app).delete('/profile/user-123/interest').send({ interest: 'AI' });
    expect(res.status).toBe(200);
  });
});
