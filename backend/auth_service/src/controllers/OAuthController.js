import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

export class OAuthController {
  /**
   * @param {Object} deps
   * @param {import("../services/OAuthService.js").OAuthService} deps.oauthService
   * @param {import("../services/AuthService.js").AuthService} deps.authService
   */
  constructor({ oauthService, authService }) {
    this.oauthService = oauthService;
    this.authService = authService;
  }

  /**
   * Login or register using OAuth provider
   * @returns {Promise<Object>} user and tokens
   */
  async login(req, res) {
    try {
      const { provider_name, provider_user } = req.body;
      const { user, access_token, refresh_token } = await this.oauthService.login(provider_name, provider_user);

      res.json({ user, accessToken: access_token, refreshToken: refresh_token });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}
