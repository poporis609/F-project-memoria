/**
 * Custom hook for getting current user information
 * Provides easy access to authenticated user data and utility functions
 */

import { useAuth } from './useAuth';
import { getUserId, getDisplayName, getUserInitials, getUserProfile } from '@/utils/userUtils';

export function useCurrentUser() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return {
    // Raw user data
    user,
    isAuthenticated,
    isLoading,
    
    // Processed user data
    userId: getUserId(user),
    displayName: getDisplayName(user),
    initials: getUserInitials(user),
    profile: getUserProfile(user),
    
    // User properties with fallbacks
    email: user?.email || '',
    name: user?.name || '',
    nickname: user?.nickname || '',
    username: user?.username || '',
    sub: user?.sub || '',
    emailVerified: user?.emailVerified || false,
    
    // Utility functions
    hasUser: isAuthenticated && !!user,
    isReady: !isLoading && isAuthenticated && !!getUserId(user),
  };
}

export default useCurrentUser;