/**
 * Authentication utility functions
 */

import { AuthError, AuthErrorCode } from '../types/auth';

/**
 * Get user-friendly error message from Cognito error
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  const errorCode = error.code || error.name;
  
  switch (errorCode) {
    case AuthErrorCode.USER_NOT_FOUND:
      return 'User not found. Please check your email address.';
    
    case AuthErrorCode.INVALID_PASSWORD:
      return 'Invalid email or password. Please try again.';
    
    case AuthErrorCode.USER_NOT_CONFIRMED:
      return 'Please confirm your email address before signing in.';
    
    case AuthErrorCode.CODE_MISMATCH:
      return 'Invalid verification code. Please try again.';
    
    case AuthErrorCode.EXPIRED_CODE:
      return 'Verification code has expired. Please request a new one.';
    
    case AuthErrorCode.LIMIT_EXCEEDED:
      return 'Too many attempts. Please try again later.';
    
    case AuthErrorCode.INVALID_PARAMETER:
      return 'Invalid input. Please check your information.';
    
    case AuthErrorCode.USERNAME_EXISTS:
      return 'An account with this email already exists.';
    
    case AuthErrorCode.INVALID_PASSWORD_EXCEPTION:
      return 'Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, number, and special character.';
    
    case AuthErrorCode.TOO_MANY_REQUESTS:
      return 'Too many requests. Please wait a moment and try again.';
    
    case AuthErrorCode.TOO_MANY_FAILED_ATTEMPTS:
      return 'Too many failed attempts. Please try again later.';
    
    default:
      return error.message || 'An error occurred. Please try again.';
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, uppercase, lowercase, number, special character
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/**
 * Get password strength requirements text
 */
export function getPasswordRequirements(): string[] {
  return [
    'At least 8 characters long',
    'Contains uppercase letter (A-Z)',
    'Contains lowercase letter (a-z)',
    'Contains number (0-9)',
    'Contains special character (!@#$%^&*)',
  ];
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Validate nickname format
 */
export function isValidNickname(nickname: string): boolean {
  // 2-20 characters, alphanumeric and underscore only
  const nicknameRegex = /^[a-zA-Z0-9_]{2,20}$/;
  return nicknameRegex.test(nickname);
}

/**
 * Validate name format
 */
export function isValidName(name: string): boolean {
  // 1-50 characters, letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
  return nameRegex.test(name.trim());
}

/**
 * Validate verification code format
 */
export function isValidVerificationCode(code: string): boolean {
  // 6 digits
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
}

/**
 * Format auth error for display
 */
export function formatAuthError(error: AuthError): string {
  return getAuthErrorMessage(error);
}

/**
 * Check if error is a specific auth error type
 */
export function isAuthError(error: any, errorCode: AuthErrorCode): boolean {
  return error?.code === errorCode || error?.name === errorCode;
}

/**
 * Extract JWT payload without verification (for display purposes only)
 */
export function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token');
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired (without verification)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJWTPayload(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = decodeJWTPayload(token);
    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Format time remaining until token expiration
 */
export function formatTokenTimeRemaining(token: string): string {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return 'Unknown';
  }

  const now = new Date();
  const timeRemaining = expiration.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(timeRemaining / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

/**
 * Storage keys for auth data
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'cognito_access_token',
  ID_TOKEN: 'cognito_id_token',
  REFRESH_TOKEN: 'cognito_refresh_token',
  USER_INFO: 'cognito_user_info',
} as const;

/**
 * Clear all auth data from storage
 */
export function clearAuthStorage(): void {
  Object.values(AUTH_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

/**
 * Get stored auth token
 */
export function getStoredToken(tokenType: keyof typeof AUTH_STORAGE_KEYS): string | null {
  const key = AUTH_STORAGE_KEYS[tokenType];
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

/**
 * Store auth token
 */
export function storeToken(tokenType: keyof typeof AUTH_STORAGE_KEYS, token: string, persistent: boolean = true): void {
  const key = AUTH_STORAGE_KEYS[tokenType];
  const storage = persistent ? localStorage : sessionStorage;
  storage.setItem(key, token);
}