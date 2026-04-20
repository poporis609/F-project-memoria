/**
 * User utility functions for handling authenticated user data
 */

import { CognitoUserInfo } from '@/types/auth';

/**
 * Get user ID from authenticated user
 * Priority: sub (Cognito unique ID) > username > email
 */
export function getUserId(user: CognitoUserInfo | null): string | null {
  if (!user) return null;
  
  // Cognito sub is the most reliable unique identifier
  if (user.sub) return user.sub;
  
  // Fallback to username
  if (user.username) return user.username;
  
  // Last resort: email
  if (user.email) return user.email;
  
  return null;
}

/**
 * Get display name for user
 * Priority: name > nickname > username > email
 */
export function getDisplayName(user: CognitoUserInfo | null): string {
  if (!user) return 'Guest';
  
  if (user.name) return user.name;
  if (user.nickname) return user.nickname;
  if (user.username) return user.username;
  if (user.email) return user.email;
  
  return 'User';
}

/**
 * Get user initials for avatar display
 */
export function getUserInitials(user: CognitoUserInfo | null): string {
  if (!user) return 'G';
  
  const displayName = getDisplayName(user);
  const words = displayName.split(' ');
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  return displayName.substring(0, 2).toUpperCase();
}

/**
 * Check if user has required permissions
 */
export function hasPermission(user: CognitoUserInfo | null, permission: string): boolean {
  if (!user) return false;
  
  // Add your permission logic here
  // For now, all authenticated users have all permissions
  return true;
}

/**
 * Get user profile data for API calls
 */
export function getUserProfile(user: CognitoUserInfo | null) {
  if (!user) return null;
  
  return {
    id: getUserId(user),
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    username: user.username,
    emailVerified: user.emailVerified,
    sub: user.sub,
  };
}

/**
 * Format user data for database storage
 */
export function formatUserForDB(user: CognitoUserInfo) {
  return {
    cognito_sub: user.sub,
    email: user.email,
    name: user.name || '',
    nickname: user.nickname || '',
    username: user.username || '',
    email_verified: user.emailVerified || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}