import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const PROFILE_LIMITS = {
  display_name: { min: 1, max: 50, required: true },
  bio: { max: 200 },
  school: { max: 100 },
};

const SOCIAL_URL_MIN_LENGTH = 11;
const SOCIAL_URL_MAX_LENGTH = 254;
const SOCIAL_PLATFORM_DOMAINS = {
  github: ["github.com"],
  linkedin: ["linkedin.com"],
  twitter: ["twitter.com", "x.com"],
  facebook: ["facebook.com"],
};

const PRIVACY_BOOLEAN_FIELDS = [
  "show_full_name",
  "show_bio",
  "show_gender",
  "show_birthday",
  "show_location",
  "show_avatar",
  "show_profile",
  "allow_tagging",
];

const PROFILE_VISIBILITY_VALUES = new Set(["public", "private"]);
const ALLOW_MESSAGES_VALUES = new Set(["everyone", "no_one", "contacts"]);

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function validateOptionalStringLength(value, field, { min, max, required }) {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  const length = value.trim().length;
  if ((required || min) && length < (min ?? 1)) {
    throw new Error(`${field} is too short`);
  }

  if (max && value.length > max) {
    throw new Error(`${field} is too long`);
  }
}

function normalizeInterest(interest) {
  if (typeof interest !== "string" || interest.trim() === "") {
    throw new Error("Interest is required");
  }

  return interest.trim();
}

function normalizePrivacySettings(settings = {}) {
  const normalized = { ...settings };

  if (normalized.profile_visibility !== undefined) {
    const visibility = String(normalized.profile_visibility).trim().toLowerCase();

    if (!PROFILE_VISIBILITY_VALUES.has(visibility)) {
      throw new Error("profile_visibility must be public or private");
    }

    normalized.show_profile = visibility === "public" ? 1 : 0;
    delete normalized.profile_visibility;
  }

  for (const field of PRIVACY_BOOLEAN_FIELDS) {
    if (
      normalized[field] !== undefined &&
      normalized[field] !== true &&
      normalized[field] !== false &&
      normalized[field] !== 0 &&
      normalized[field] !== 1
    ) {
      throw new Error(`${field} must be a boolean`);
    }
  }

  if (
    normalized.allow_messages !== undefined &&
    !ALLOW_MESSAGES_VALUES.has(String(normalized.allow_messages).trim().toLowerCase())
  ) {
    throw new Error("allow_messages is invalid");
  }

  return normalized;
}

export class ProfileService {
  /**
   * ProfileService constructor
   * @param {Object} deps - Dependencies
   * @param {import('../repos/UserRepository.js').default} deps.userRepo
   * @param {import('../repos/UserProfileDetailsRepository.js').default} deps.profileRepo
   * @param {import('../repos/UserPrivacySettingsRepository.js').default} deps.privacyRepo
   * @param {import('../repos/UserSocialLinksRepository.js').default} deps.socialRepo
   * @param {import('../repos/UserInterestsRepository.js').default} deps.interestsRepo
   */
  constructor({
    userRepo,
    profileRepo,
    privacyRepo,
    socialRepo,
    interestsRepo,
  }) {
    this.userRepo = userRepo;
    this.profileRepo = profileRepo;
    this.privacyRepo = privacyRepo;
    this.socialRepo = socialRepo;
    this.interestsRepo = interestsRepo;
  }

  /**
   * Get full profile of a user including details, privacy, social links and interests
   * @param {string} user_id - ID of the user
   * @returns {Promise<Object>} - Object containing user, details, privacy, socialLinks, interests
   * @throws {Error} If user not found
   */
  async getInfo(user_id) {
    const user = await this.userRepo.findById(user_id);
    if (!user) throw new Error("User not found");
    return { user };
  }

  /**
   * @param {string} target_user_id - ID of the profile owner
   * @param {string} viewer_id - ID of the viewer
   * @returns {Promise<Object>} Profile result with ownership flag
   * @throws {Error} If profile not found or not accessible
   */
  async getProfile({ target_user_id, viewer_id }) {
    const isOwner = target_user_id === viewer_id;

    if (isOwner) {
      const profile = await this.profileRepo.findOwnerProfile(target_user_id);
      if (!profile) throw new Error("User not found");

      return {
        isOwner: true,
        profile,
      };
    }

    const profile = await this.profileRepo.findPublicProfile(target_user_id);
    if (!profile) {
      throw new Error("Profile is private or not found");
    }

    return {
      isOwner: false,
      profile,
    };
  }

  /**
   * Update user's profile information
   * @param {string} user_id - ID of the user
   * @param {Object} data - Profile data
   * @param {string} data.display_name
   * @param {string} data.full_name
   * @param {string} data.bio
   * @param {string} data.gender
   * @param {string} data.birthday
   * @param {string} data.country
   * @param {string} data.city
   * @returns {Promise<Object>} - Updated user and details
   */
  async updateProfile(user_id, data) {
    validateOptionalStringLength(
      data.display_name,
      "display_name",
      PROFILE_LIMITS.display_name
    );
    validateOptionalStringLength(data.bio, "bio", PROFILE_LIMITS.bio);
    validateOptionalStringLength(data.school, "school", PROFILE_LIMITS.school);

    const updatedUser = await this.userRepo.updateUserById(user_id, {
      display_name: data.display_name,
      full_name: data.full_name,
    });

    const updatedDetails = await this.profileRepo.upsert({
      user_id,
      bio: data.bio,
      gender: data.gender,
      birthday: data.birthday,
      country: data.country,
      city: data.city,
    });

    return { user: updatedUser, details: updatedDetails };
  }

  /**
   * Update user's avatar
   * @param {string} user_id - ID of the user
   * @param {Object} file - File object from multer
   * @param {Buffer|ArrayBuffer} file.buffer - File buffer
   * @param {string} [folder="avatars"] - Cloudinary folder
   * @returns {Promise<Object>} - Updated user with avatar URL
   * @throws {Error} If file is missing, not an image, or user not found
   */
  async updateAvatar(user_id, file, folder = "avatars") {
    if (!file || !file.buffer) throw new Error("No avatar file uploaded");

    const allowedExts = ["jpg", "jpeg", "png", "webp"];

    const type = await fileTypeFromBuffer(file.buffer);
    if (!type || !allowedExts.includes(type.ext)) {
      throw new Error("Uploaded file is not a valid image.");
    }

    const user = await this.userRepo.findById(user_id);
    if (!user) throw new Error("User not found");

    const publicId = `avatar_${user_id}`;
    const buffer = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer);

    const uploaded = await uploadToCloudinary(buffer, {
      folder,
      public_id: publicId,
      overwrite: true,
    });

    return this.userRepo.updateUserById(user_id, {
      avatar_url: uploaded.secure_url,
    });
  }

  /**
   * Get privacy settings of a user
   * @param {string} user_id - ID of the user
   * @returns {Promise<Object>} - Privacy settings
   */
  async getPrivacy(user_id) {
    return this.privacyRepo.findByUserId(user_id);
  }

  /**
   * Update privacy settings of a user
   * @param {string} user_id - ID of the user
   * @param {Object} settings - Privacy settings to update
   * @returns {Promise<Object>} - Updated privacy settings
   */
  async updatePrivacy(user_id, settings) {
    return this.privacyRepo.upsert({
      user_id,
      ...normalizePrivacySettings(settings),
    });
  }

  /**
   * Search users by query, country or interest
   * @param {Object} filters
   * @param {string} [filters.query] - Search text
   * @param {string} [filters.country] - Country filter
   * @param {string} [filters.interest] - Interest filter
   * @returns {Promise<Array<Object>>} - Array of matched users
   */
  async searchUsers({ keyword, limit = 5, offset = 0 }) {
    const rows = await this.userRepo.searchByKeyword(keyword, limit, offset);

    if (!rows || rows.length === 0) return [];

    return rows.map((row) => ({
      id: row.user_id,
      display_name: row.display_name,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      status: row.status,
      country: row.country,
      city: row.city,
      bio: row.bio,
      gender: row.gender,
      birthday: row.birthday,
    }));
  }

  /**
   * Add or update a social link for a user
   * @param {string} user_id
   * @param {string} url
   * @param {string} [requestedPlatform]
   */
  async addSocialLink(user_id, url, requestedPlatform) {
    if (!url) {
      throw new Error("Social link URL is required");
    }

    if (typeof url !== "string") {
      throw new Error("Social link URL must be a string");
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    if (
      url.length < SOCIAL_URL_MIN_LENGTH ||
      url.length > SOCIAL_URL_MAX_LENGTH
    ) {
      throw new Error("Social link URL length is invalid");
    }

    const host = parsedUrl.hostname.toLowerCase();
    const normalizedPlatform =
      typeof requestedPlatform === "string"
        ? requestedPlatform.trim().toLowerCase()
        : "";

    const platform =
      normalizedPlatform ||
      Object.entries(SOCIAL_PLATFORM_DOMAINS).find(([_, domains]) =>
        domains.some((d) => host.includes(d))
      )?.[0];

    if (!platform || !SOCIAL_PLATFORM_DOMAINS[platform]) {
      throw new Error("Unsupported social media platform");
    }

    const existing = await this.socialRepo.findByUserAndPlatform(
      user_id,
      platform
    );

    if (existing) {
      return this.socialRepo.updateLink(existing.id, { url });
    }

    return this.socialRepo.createLink({
      id: uuidv4(),
      user_id,
      platform,
      url,
    });
  }

  /**
   * Remove a social link by ID
   * @param {string} id - Social link ID
   * @returns {Promise<number>} - Number of records deleted
   */
  async removeSocialLink(user_id, id) {
    const existing = await this.socialRepo.findById(id);

    if (!existing) {
      throw new Error("Social link not found");
    }

    if (user_id && existing.user_id !== user_id) {
      throw httpError("Cannot remove another user's social link", 403);
    }

    return this.socialRepo.deleteLink(id);
  }

  /**
   * Add an interest for a user
   * @param {string} user_id - ID of the user
   * @param {string} interest - Interest name
   * @returns {Promise<Object>} - Added interest record
   */
  async addInterest(user_id, interest) {
    const normalizedInterest = normalizeInterest(interest);
    const existing = await this.interestsRepo.findByUserAndInterest(
      user_id,
      normalizedInterest
    );

    if (existing) {
      throw new Error("Interest already exists");
    }

    return this.interestsRepo.addInterest(user_id, normalizedInterest, uuidv4());
  }

  /**
   * Remove an interest for a user
   * @param {string} user_id - ID of the user
   * @param {string} interest - Interest name
   * @returns {Promise<number>} - Number of interests removed
   */
  async removeInterest(user_id, interest) {
    const normalizedInterest = normalizeInterest(interest);
    const removed = await this.interestsRepo.removeInterest(
      user_id,
      normalizedInterest
    );

    if (!removed) {
      throw new Error("Interest not found");
    }

    return removed;
  }
}
