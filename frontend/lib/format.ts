/**
 * Format utilities for consistent display across the application
 */

/**
 * Format currency in VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Format shipping address from string or Address object
 */
export function formatShippingAddress(address: string | { street?: string; ward?: string; district?: string; city?: string; address?: string } | undefined): string {
  if (!address) return "";
  if (typeof address === "string") return address;
  
  const parts: string[] = [];
  if (address.street || address.address) parts.push(address.street || address.address || "");
  if (address.ward) parts.push(address.ward);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);
  
  return parts.filter(Boolean).join(", ");
}

/**
 * Format date in Vietnamese locale
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("vi-VN", options);
}

/**
 * Format date and time in Vietnamese locale
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("vi-VN");
}

