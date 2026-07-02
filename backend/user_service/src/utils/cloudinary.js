import cloudinary from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.v2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

function hasPlaceholderCredentials() {
  return [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
  ].some((value) => !value || value.startsWith("your_"));
}

/**
 * Upload file to Cloudinary
 * @param {Buffer|string} file - Buffer or base64 string
 * @param {Object} options - folder, public_id, overwrite
 */
export async function uploadToCloudinary(file, options = {}) {
  if (hasPlaceholderCredentials()) {
    const folder = options.folder || "uploads";
    const publicId = options.public_id || `upload_${Date.now()}`;
    return {
      secure_url: `https://studyhub.local/${folder}/${publicId}`,
      public_id: publicId,
    };
  }

  let fileToUpload = file;

  if (Buffer.isBuffer(file)) {
    // chuyển Buffer → Base64 Data URI (mặc định image/jpeg)
    const base64 = file.toString('base64');
    fileToUpload = `data:image/jpeg;base64,${base64}`;
  }

  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(fileToUpload, options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Delete file from Cloudinary by public_id
 * @param {string} publicId
 */
export async function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.destroy(publicId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
