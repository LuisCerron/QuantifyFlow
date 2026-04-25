/**
 * Converts various date formats to a Date object safely
 * Handles Firestore Timestamp, Date, string, and null/undefined
 */
export function toDateSafe(date: unknown): Date | null {
  if (!date) return null;
  
  if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as any).toDate === 'function') {
    return (date as any).toDate();
  }
  
  if (date instanceof Date) return date;
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  if (typeof date === 'object' && date !== null && 'seconds' in date) {
    return new Date((date as any).seconds * 1000);
  }
  
  return null;
}

/**
 * Formats a date for display with relative time for recent dates
 */
export function formatDate(date: Date | null | undefined, options?: {
  showRelative?: boolean;
  format?: 'short' | 'long' | 'time';
}): string {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (options?.showRelative) {
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  }
  
  const format = options?.format || 'short';
  
  if (format === 'time') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date for datetime attribute in HTML
 */
export function toDateTimeString(date: Date | null): string | undefined {
  return date?.toISOString();
}

/**
 * Format date with locale (for internationalization)
 */
export function formatDateLocale(dateValue: unknown, locale = 'es-ES'): string | null {
  const d = toDateSafe(dateValue);
  if (!d) return null;
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}