/**
 * Image URL normalization utilities
 * Converts various image URL formats to proper API endpoints
 */

/**
 * Parse image URL to extract folder and filename
 * @param imageUrl - Image URL from database or API response
 * @returns { folder, filename } or null if invalid
 */
export function parseImageUrl(
  imageUrl: string | null | undefined
): { folder: string; filename: string } | null {
  if (!imageUrl) return null;

  // Match patterns like: /images/products/uuid.jpg, /images/hero/uuid.png, etc.
  const match = imageUrl.match(/\/images\/([^/]+)\/(.+)$/);
  if (match) {
    const [, folder, filename] = match;
    return { folder, filename };
  }

  // If it's just a filename (from older format), try to guess folder
  if (!imageUrl.includes("/")) {
    // Could be from any folder - try products first as fallback
    return { folder: "products", filename: imageUrl };
  }

  return null;
}

/**
 * Convert image URL to API endpoint
 * Handles multiple URL formats and converts them to the new GET endpoint
 *
 * @param imageUrl - Image URL (e.g., "/images/products/uuid.jpg", "http://example.com/images/products/uuid.jpg")
 * @returns Proper API endpoint or original URL if invalid
 *
 * @example
 * normalizeImageUrl("/images/products/abc123.jpg")
 * // => "/api/upload/products/abc123.jpg"
 *
 * normalizeImageUrl("http://localhost:3001/images/hero/xyz789.png")
 * // => "/api/upload/hero/xyz789.png"
 */
export function normalizeImageUrl(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl) return null;

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const apiRoot = apiBaseUrl.replace(/\/api\/?$/, "");
  const withApiRoot = (path: string) =>
    path.startsWith("http") ? path : `${apiRoot}${path}`;

  // Keep absolute URLs as-is (external images or already absolute uploads)
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/api/upload/")) {
    return withApiRoot(imageUrl);
  }

  // Keep public folder paths as-is (Next.js serves from /public)
  // Only normalize if it's from backend/API
  if (imageUrl.startsWith("/images/")) {
    // Check if it's a static file in public folder (like hero-banner.jpg)
    // These should be kept as-is for Next.js to serve
    const publicStaticFiles = ["hero-banner.jpg", "logo.png", "default"];
    const isStaticFile = publicStaticFiles.some(file => imageUrl.includes(file));
    if (isStaticFile) {
      return imageUrl; // Keep as-is for Next.js public folder
    }
    // Otherwise, it's from backend API
    return withApiRoot(imageUrl);
  }

  // Try to parse the image URL
  const parsed = parseImageUrl(imageUrl);
  if (parsed) {
    return withApiRoot(`/api/upload/${parsed.folder}/${parsed.filename}`);
  }

  // Fallback: return original URL
  return imageUrl;
}

/**
 * Get folder name from image URL
 */
export function getImageFolder(
  imageUrl: string | null | undefined
): string | null {
  const parsed = parseImageUrl(imageUrl);
  return parsed?.folder || null;
}

/**
 * Get filename from image URL
 */
export function getImageFilename(
  imageUrl: string | null | undefined
): string | null {
  const parsed = parseImageUrl(imageUrl);
  return parsed?.filename || null;
}
