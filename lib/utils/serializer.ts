/**
 * Serializes Firestore documents for client consumption.
 * Converts Firestore Timestamps to ISO strings, recursively.
 */
export function serializeForClient<T extends Record<string, any>>(data: T): T {
  const serialized = { ...data } as Record<string, any>;
  
  for (const key in serialized) {
    const value = serialized[key];
    
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      serialized[key] = value.toDate().toISOString();
    }
    else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      serialized[key] = new Date(value.seconds * 1000).toISOString();
    }
    else if (Array.isArray(value)) {
      serialized[key] = value.map((item: any) => 
        typeof item === 'object' && item !== null ? serializeForClient(item) : item
      );
    }
    else if (value && typeof value === 'object' && value !== null && !('toDate' in value) && !('seconds' in value)) {
      serialized[key] = serializeForClient(value);
    }
  }
  
  return serialized as T;
}
