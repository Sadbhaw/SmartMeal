/**
 * Pure date utility functions for grocery inventory expiry dates.
 * These functions are framework-agnostic and can be tested in isolation.
 */

/**
 * Format a YYYY-MM-DD date string to DD-MM-YYYY for UI display.
 * Returns null if the input is null, undefined, empty, or not a valid YYYY-MM-DD date.
 */
export function formatExpiryDate(date: string | null | undefined): string | null {
  if (!date) return null;

  // Extract just the date part if it's a full ISO datetime
  const datePart = date.slice(0, 10);

  // Validate YYYY-MM-DD format
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/**
 * Check if a grocery item's expiry date is in the past or today.
 * Uses calendar date comparison (no timezone conversion).
 * Returns false if expiry_date is null or undefined.
 */
export function isExpired(item: { expiry_date: string | null | undefined }): boolean {
  if (!item.expiry_date) return false;

  const datePart = item.expiry_date.slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, year, month, day] = match;
  const expiryDate = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10)
  );

  const today = new Date();
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Expired if expiry date is before today, or today (expires today)
  return expiryDate.getTime() <= todayDate.getTime();
}