/**
 * Custom hook for syncing Cognito user with database
 * Automatically syncs user data when authentication state changes
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { getUserService, DBUser } from '@/services/userService';

export function useUserSync() {
  const { user, isAuthenticated } = useAuth();
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  // userService를 useMemo로 안정화
  const userService = useMemo(() => getUserService(), []);

  // 안정적인 syncUser 함수
  const syncUser = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const syncedUser = await userService.syncUser(user);
      setDbUser(syncedUser);
      setIsSynced(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sync user';
      setError(errorMessage);
      console.error('User sync failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.sub, user?.email, user?.name, user?.nickname, user?.username, user?.emailVerified, userService]);

  useEffect(() => {
    // sessionStorage로 중복 동기화 방지
    const syncKey = `user_synced_${user?.sub}`;
    const alreadySynced = sessionStorage.getItem(syncKey);
    
    if (isAuthenticated && user && !isSynced && !alreadySynced) {
      syncUser().then(() => {
        // 동기화 완료 표시
        if (user?.sub) {
          sessionStorage.setItem(syncKey, 'true');
        }
      }).catch((err) => {
        console.error('Sync failed:', err);
      });
    } else if (isAuthenticated && user && alreadySynced && !isSynced) {
      // 이미 동기화된 경우 상태만 업데이트
      setIsSynced(true);
    } else if (!isAuthenticated) {
      // Clear user data when logged out
      setDbUser(null);
      setIsSynced(false);
      setError(null);
      // sessionStorage 클리어
      if (user?.sub) {
        sessionStorage.removeItem(`user_synced_${user.sub}`);
      }
    }
  }, [isAuthenticated, user?.sub, isSynced, syncUser]);

  const refreshUser = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const refreshedUser = await userService.getUserProfile(user.sub);
      setDbUser(refreshedUser);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refresh user data';
      setError(errorMessage);
      console.error('User refresh failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.sub, userService]);

  const updateProfile = useCallback(async (updates: Partial<DBUser>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedUser = await userService.updateUser(user.sub, updates);
      setDbUser(updatedUser);
      return updatedUser;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update profile';
      setError(errorMessage);
      console.error('Profile update failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.sub, userService]);

  return {
    // Database user data
    dbUser,
    
    // Sync status
    isLoading,
    error,
    isSynced,
    
    // Actions
    syncUser,
    refreshUser,
    updateProfile,
    
    // Computed values
    userId: dbUser?.cognito_sub || user?.sub || null,
    userEmail: dbUser?.email || user?.email || '',
    userName: dbUser?.name || user?.name || '',
    userNickname: dbUser?.nickname || user?.nickname || '',
    profileImageUrl: dbUser?.profile_image_url || null,
  };
}

export default useUserSync;