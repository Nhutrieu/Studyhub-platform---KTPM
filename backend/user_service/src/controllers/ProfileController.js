import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

function errorStatus(err, fallback = 400) {
  return err.statusCode || fallback;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function ensureOwnProfile(req) {
  if (req.user?.id && req.params?.user_id && req.user.id !== req.params.user_id) {
    throw forbidden("Cannot modify another user's profile");
  }
}

export class ProfileController {
  /**
   * @param {Object} deps
   * @param {import('../services/ProfileService.js').ProfileService} deps.profileService
   */
  constructor({ profileService }) {
    this.profileService = profileService;

    // Bind middleware để upload avatar
    this.updateAvatar = [upload.single("avatar"), this.updateAvatar.bind(this)];
  }

  /** Get info */
  async getInfo({ params }, res) {
    try {
      const profile = await this.profileService.getInfo(params.user_id);
      res.json(profile);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /** Get full profile */
  async getProfile(req, res) {
    try {
      const result = await this.profileService.getProfile({
        target_user_id: req.params.user_id,
        viewer_id: req.user.id,
      });

      res.json(result);
    } catch (err) {
      res.status(403).json({ error: err.message });
    }
  }

  /** Update core profile info and details */
  async updateProfile(req, res) {
    try {
      ensureOwnProfile(req);
      const updated = await this.profileService.updateProfile(
        req.params.user_id,
        req.body
      );
      res.json(updated);
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }

  /** Update avatar using Cloudinary */
  async updateAvatar(req, res) {
    try {
      ensureOwnProfile(req);
      if (!req.file) throw new Error("No avatar file uploaded");
      const updated = await this.profileService.updateAvatar(
        req.params.user_id,
        req.file
      );
      res.json(updated);
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }

  /** Get privacy settings */
  async getPrivacy({ params }, res) {
    try {
      const privacy = await this.profileService.getPrivacy(params.user_id);
      res.json(privacy);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /** Update privacy settings */
  async updatePrivacy(req, res) {
    try {
      ensureOwnProfile(req);
      const updated = await this.profileService.updatePrivacy(
        req.params.user_id,
        req.body
      );
      res.json(updated);
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }

  async searchUsers(req, res) {
    try {
      const { query, limit, offset } = req.query;
      const limitNum = limit === undefined ? 5 : Number(limit);
      const offsetNum = offset === undefined ? 0 : Number(offset);

      if (
        !Number.isInteger(limitNum) ||
        limitNum < 1 ||
        limitNum > 100
      ) {
        return res
          .status(400)
          .json({ error: "limit must be an integer from 1 to 100" });
      }

      if (!Number.isInteger(offsetNum) || offsetNum < 0) {
        return res
          .status(400)
          .json({ error: "offset must be a non-negative integer" });
      }

      const users = await this.profileService.searchUsers({
        keyword: query,
        limit: limitNum,
        offset: offsetNum,
      });

      return res.json(users);
    } catch (err) {
      console.error("Search error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  
  /** Add a social link */
  async addSocialLink(req, res) {
    try {
      ensureOwnProfile(req);
      const updated = await this.profileService.addSocialLink(
        req.params.user_id,
        req.body.url,
        req.body.platform
      );
      res.json(updated);
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }

  /** Remove a social link */
  async removeSocialLink(req, res) {
    try {
      const deleted = await this.profileService.removeSocialLink(
        req.user?.id,
        req.params.id
      );
      res.json({ success: deleted });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }

  /** Add interest */
  async addInterest(req, res) {
    try {
      ensureOwnProfile(req);
      await this.profileService.addInterest(req.params.user_id, req.body.interest);
      res.json({ success: true });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }

  /** Remove interest */
  async removeInterest(req, res) {
    try {
      ensureOwnProfile(req);
      await this.profileService.removeInterest(req.params.user_id, req.body.interest);
      res.json({ success: true });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: err.message });
    }
  }
}
