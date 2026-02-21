export interface ErrorResponse {
  error: string;
  code: string;
}

export function createErrorResponse(error: string, code: string): ErrorResponse {
  if (typeof error !== 'string') {
    throw new TypeError('Error message must be a string');
  }
  if (typeof code !== 'string') {
    throw new TypeError('Error code must be a string');
  }
  if (error.length === 0) {
    throw new Error('Error message cannot be empty');
  }
  if (code.length === 0) {
    throw new Error('Error code cannot be empty');
  }
  
  return { error, code };
}

export function validateEnv(key: string): string {
  if (typeof key !== 'string') {
    throw new TypeError('Environment variable key must be a string');
  }
  if (key.trim().length === 0) {
    throw new Error('Environment variable key cannot be empty');
  }
  
  const value = process.env[key];
  
  if (value === undefined || value === null) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  if (value.length === 0) {
    throw new Error(`Environment variable ${key} cannot be empty`);
  }
  
  return value;
}

export function formatDate(d: Date | string | number): string {
  let date: Date;
  
  if (d instanceof Date) {
    date = d;
  } else if (typeof d === 'string') {
    date = new Date(d);
  } else if (typeof d === 'number' && !isNaN(d)) {
    date = new Date(d);
  } else {
    throw new TypeError('Input must be a valid Date, string, or number timestamp');
  }
  
  if (isNaN(date.getTime())) {
    throw new RangeError('Invalid date value provided');
  }
  
  return date.toISOString();
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  
  const hex = '0123456789abcdef';
  let uuid = '';
  
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex.charAt((Math.random() * 4) | 8);
    } else {
      uuid += hex.charAt(Math.floor(Math.random() * 16));
    }
  }
  
  return uuid;
}