import { v4 as uuidv4 } from "uuid";
import { createTokenHash } from "../utils/tokenHash.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

export class OAuthService {
  /**
   * @param {Object} deps - Dependency injection
   * @param {import("../repos/OAuthProviderRepository.js").OAuthProviderRepository} deps.oAuthProviderRepo
   * @param {import("../repos/OAuthAccountRepository.js").OAuthAccountRepository} deps.oAuthAccountRepo
   * @param {import("../repos/UserRepository.js").UserRepository} deps.userRepo
   * @param {import("../repos/UserEmailRepository.js").UserEmailRepository} deps.userEmailRepo
   * @param {import("../repos/SessionRepository.js").SessionRepository} deps.sessionRepo
   * @param {import("../repos/AuditLogRepository.js").AuditLogRepository} deps.auditRepo
   * @param {import("../repos/UserRoleRepository.js").UserRoleRepository} deps.userRoleRepo
   * @param {import("../repos/RoleRepository.js").RoleRepository} deps.roleRepo
   */
  constructor({
    oAuthProviderRepo,
    oAuthAccountRepo,
    userRepo,
    userEmailRepo,
    sessionRepo,
    auditRepo,
    userRoleRepo,
    roleRepo,
  }) {
    this.oAuthProviderRepo = oAuthProviderRepo;
    this.oAuthAccountRepo = oAuthAccountRepo;
    this.userRepo = userRepo;
    this.userEmailRepo = userEmailRepo;
    this.sessionRepo = sessionRepo;
    this.auditRepo = auditRepo;
    this.userRoleRepo = userRoleRepo;
    this.roleRepo = roleRepo;
  }

  /**
   * Login or register using OAuth provider
   * @param {string} provider_name - OAuth provider name (e.g., google, github)
   * @param {Object} provider_user - Provider user info
   * @param {string} provider_user.id - Provider user ID
   * @param {string} [provider_user.name] - User name
   * @param {string} [provider_user.email] - User email
   * @param {string} [provider_user.user_agent]
   * @param {string} [provider_user.ip]
   * @returns {Promise<Object>} user
   */
  async login(provider_name, provider_user) {
    if (!provider_name || !provider_user || !provider_user.id)
      throw new Error("Invalid provider payload");

    // Find OAuth provider
    let provider = await this.oAuthProviderRepo.findByName(provider_name);
    if (!provider && ["google", "facebook", "github", "linkedin"].includes(provider_name)) {
      provider = { name: provider_name };
    }
    if (!provider) throw new Error("Provider not supported");

    // Check if OAuth account already exists
    let user;
    const existing_account = await this.oAuthAccountRepo.find(
      provider_name,
      provider_user.id
    );

    if (existing_account) {
      user = await this.userRepo.findById(existing_account.user_id);
      await this.auditRepo.logAction({
        id: uuidv4(),
        actor_user_id: user.id,
        action: "OAUTH_LOGIN",
        created_at: new Date(),
      });
    } else {
      // If email exists, link account; otherwise create new user
      if (provider_user.email) {
        const existing_email = await this.userEmailRepo.findByEmail(
          provider_user.email
        );
        if (existing_email) {
          user = await this.userRepo.findById(existing_email.user_id);
        } else {
          // Create new user
          user = await this.userRepo.create({
            id: uuidv4(),
            user_name: provider_user.name || provider_user.email.split("@")[0],
            password_hash: "",
            status: "active",
            created_at: new Date(),
          });

          // Create primary email
          await this.userEmailRepo.create({
            id: uuidv4(),
            user_id: user.id,
            email: provider_user.email,
            type: "primary",
            is_verified: 1,
            created_at: new Date(),
          });
        }
      } else {
        // User without email
        user = await this.userRepo.create({
          id: uuidv4(),
          user_name: provider_user.name || `user_${Date.now()}`,
          password_hash: "",
          status: "active",
          created_at: new Date(),
        });
      }

      // Assign default role
      const default_role = await this.roleRepo.findByName("user");
      if (default_role) {
        await this.userRoleRepo.assignRole({
          id: uuidv4(),
          user_id: user.id,
          role_id: default_role.id,
          assigned_at: new Date(),
        });
      }

      // Link OAuth account
      await this.oAuthAccountRepo.linkAccount({
        id: uuidv4(),
        user_id: user.id,
        provider: provider_name,
        provider_user_id: provider_user.id,
        created_at: new Date(),
      });

      await this.auditRepo.logAction({
        id: uuidv4(),
        actor_user_id: user.id,
        action: "OAUTH_REGISTER",
        created_at: new Date(),
      });
    }

    // Create session tokens (for both login and registration)
    const access_token = signAccessToken({
      id: user.id,
      name: user.user_name,
    });
    const refresh_token = signRefreshToken({ id: user.id });

    await this.sessionRepo.create({
      id: uuidv4(),
      user_id: user.id,
      refresh_token_hash: createTokenHash(refresh_token),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ip: provider_user.ip || null,
      user_agent: provider_user.user_agent || null,
    });

    return { user, access_token, refresh_token };
  }
}
