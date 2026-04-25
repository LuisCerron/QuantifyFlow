/**
 * Chunk an array into batches of specified size (for Firebase 'in' queries with 10-item limit)
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Debounce function for search inputs and API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate unique ID without external dependencies
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * cx helper for class concatenation (simple version without tailwind-merge)
 */
export function cx(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}