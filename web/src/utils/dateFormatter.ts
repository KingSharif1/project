/**
 * Date formatting utilities for American date format (MM/DD/YYYY)
 */

/**
 * Parse date string ensuring UTC timestamps are handled correctly
 * - If string ends with 'Z' or has timezone info: treat as UTC, convert to local
 * - Otherwise: treat as local time
 */
const parseDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  
  // If it's already a UTC timestamp (ends with Z or has +00:00), Date constructor handles it
  // JavaScript automatically converts UTC to local timezone
  return new Date(date);
};

/**
 * Format a date to American format: MM/DD/YYYY
 * Handles both UTC timestamps (from database) and local times correctly
 */
export const formatDateUS = (date: string | Date | null | undefined): string => {
  if (!date) return 'Not set';

  try {
    const d = parseDate(date);
    if (isNaN(d.getTime())) return 'Invalid date';

    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();

    return `${month}/${day}/${year}`;
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Format a date to American format with time: MM/DD/YYYY HH:MM AM/PM
 * Handles both UTC timestamps (from database) and local times correctly
 */
export const formatDateTimeUS = (date: string | Date | null | undefined): string => {
  if (!date) return 'Not set';

  try {
    const d = parseDate(date);
    if (isNaN(d.getTime())) return 'Invalid date';

    // getMonth(), getDate(), getHours() etc. automatically return LOCAL time values
    // JavaScript has already converted UTC to local timezone for us
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Format a date to American format with full month name: Month DD, YYYY
 */
export const formatDateUSLong = (date: string | Date | null | undefined): string => {
  if (!date) return 'Not set';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';

    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Format time only: HH:MM AM/PM
 * Handles both UTC timestamps (from database) and local times correctly
 */
export const formatTimeUS = (date: string | Date | null | undefined): string => {
  if (!date) return 'Not set';

  try {
    const d = parseDate(date);
    if (isNaN(d.getTime())) return 'Invalid time';

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return 'Invalid time';
  }
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
};

/**
 * Format datetime for input fields (YYYY-MM-DDTHH:mm)
 */
export const formatDateTimeForInput = (date: string | Date | null | undefined): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'Unknown';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const isPast = diffMs < 0;
    const suffix = isPast ? 'ago' : 'from now';

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ${suffix}`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${suffix}`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${suffix}`;

    return formatDateUS(d);
  } catch (error) {
    return 'Invalid date';
  }
};
