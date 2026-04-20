import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { AuthContextState } from '../types/auth';

/**
 * Custom hook to access authentication context
 * 
 * This hook provides access to the authentication state and methods.
 * It must be used within an AuthProvider component.
 * 
 * @returns AuthContextState - The authentication context state and methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default useAuth;