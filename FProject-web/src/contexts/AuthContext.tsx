import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { getCognitoService, isCognitoConfigured } from '../services/cognitoService';
import { 
  AuthContextState, 
  CognitoUserInfo, 
  AuthAction, 
  AuthActionType,
  AuthError 
} from '../types/auth';

// Auth state interface
interface AuthState {
  user: CognitoUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case AuthActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AuthActionType.LOGIN_START:
    case AuthActionType.SIGNUP_START:
    case AuthActionType.CONFIRM_SIGNUP_START:
    case AuthActionType.FORGOT_PASSWORD_START:
    case AuthActionType.CONFIRM_PASSWORD_START:
    case AuthActionType.REFRESH_SESSION_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AuthActionType.LOGIN_SUCCESS:
    case AuthActionType.REFRESH_SESSION_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AuthActionType.SIGNUP_SUCCESS:
    case AuthActionType.CONFIRM_SIGNUP_SUCCESS:
    case AuthActionType.FORGOT_PASSWORD_SUCCESS:
    case AuthActionType.CONFIRM_PASSWORD_SUCCESS:
      return {
        ...state,
        isLoading: false,
        error: null,
      };

    case AuthActionType.LOGIN_FAILURE:
    case AuthActionType.SIGNUP_FAILURE:
    case AuthActionType.CONFIRM_SIGNUP_FAILURE:
    case AuthActionType.FORGOT_PASSWORD_FAILURE:
    case AuthActionType.CONFIRM_PASSWORD_FAILURE:
    case AuthActionType.REFRESH_SESSION_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case AuthActionType.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AuthActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AuthActionType.UPDATE_USER_PROFILE:
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextState | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const cognitoService = getCognitoService();

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, [cognitoService]); // cognitoService 의존성 추가

  // Check for existing session
  const checkExistingSession = async () => {
    try {
      console.log('🔍 세션 확인 시작...');
      dispatch({ type: AuthActionType.SET_LOADING, payload: true });
      
      // Cognito가 설정되지 않은 경우 로딩만 해제
      if (!cognitoService) {
        console.log('⚠️ Cognito가 설정되지 않아 인증 확인을 건너뜁니다.');
        dispatch({ type: AuthActionType.SET_LOADING, payload: false });
        return;
      }
      
      console.log('🔍 Cognito 서비스에서 현재 세션 가져오는 중...');
      const session = await cognitoService.getCurrentSession();
      
      if (session) {
        console.log('✅ 기존 세션 발견! 사용자:', session.user.email);
        dispatch({ 
          type: AuthActionType.LOGIN_SUCCESS, 
          payload: session.user 
        });
      } else {
        console.log('ℹ️ 기존 세션 없음 - 로그인 필요');
        dispatch({ type: AuthActionType.SET_LOADING, payload: false });
      }
    } catch (error: any) {
      console.error('❌ 세션 확인 실패:', error);
      console.error('에러 상세:', error.message, error.code);
      // 세션 확인 실패 시 로그아웃 상태로 설정
      dispatch({ type: AuthActionType.LOGOUT });
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.LOGIN_START });
      
      const result = await cognitoService.signIn(email, password);
      
      dispatch({ 
        type: AuthActionType.LOGIN_SUCCESS, 
        payload: result.user 
      });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Login failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.LOGIN_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      if (cognitoService) {
        await cognitoService.signOut();
      }
      dispatch({ type: AuthActionType.LOGOUT });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      dispatch({ type: AuthActionType.LOGOUT });
    }
  };

  // Sign up function
  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    nickname: string
  ): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.SIGNUP_START });
      
      await cognitoService.signUp(email, password, name, nickname);
      
      dispatch({ type: AuthActionType.SIGNUP_SUCCESS });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Sign up failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.SIGNUP_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Confirm sign up function
  const confirmSignUp = async (email: string, code: string): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.CONFIRM_SIGNUP_START });
      
      await cognitoService.confirmSignUp(email, code);
      
      dispatch({ type: AuthActionType.CONFIRM_SIGNUP_SUCCESS });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Email confirmation failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.CONFIRM_SIGNUP_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Resend confirmation code function
  const resendConfirmationCode = async (email: string): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      await cognitoService.resendConfirmationCode(email);
    } catch (error: any) {
      console.error('Failed to resend confirmation code:', error);
      throw error;
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.FORGOT_PASSWORD_START });
      
      await cognitoService.forgotPassword(email);
      
      dispatch({ type: AuthActionType.FORGOT_PASSWORD_SUCCESS });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Password reset request failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.FORGOT_PASSWORD_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Confirm password reset function
  const confirmPassword = async (
    email: string, 
    code: string, 
    newPassword: string
  ): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.CONFIRM_PASSWORD_START });
      
      await cognitoService.confirmPassword(email, code, newPassword);
      
      dispatch({ type: AuthActionType.CONFIRM_PASSWORD_SUCCESS });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Password reset confirmation failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.CONFIRM_PASSWORD_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Refresh session function
  const refreshSession = async (): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.REFRESH_SESSION_START });
      
      const result = await cognitoService.refreshSession();
      
      dispatch({ 
        type: AuthActionType.REFRESH_SESSION_SUCCESS, 
        payload: result.user 
      });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Session refresh failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.REFRESH_SESSION_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Get Google login URL
  const getGoogleLoginUrl = (): string => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }
    return cognitoService.getGoogleLoginUrl();
  };

  // Parse auth callback
  const parseAuthCallback = async (url: string): Promise<void> => {
    if (!cognitoService) {
      throw new Error('Cognito가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    try {
      dispatch({ type: AuthActionType.LOGIN_START });
      
      const result = await cognitoService.parseAuthCallback(url);
      
      dispatch({ 
        type: AuthActionType.LOGIN_SUCCESS, 
        payload: result.user 
      });
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'OAuth callback failed',
        name: error.name || 'Error',
      };
      
      dispatch({ 
        type: AuthActionType.LOGIN_FAILURE, 
        payload: authError 
      });
      throw error;
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AuthActionType.CLEAR_ERROR });
  };

  // Update user profile function
  const updateUserProfile = (updates: Partial<CognitoUserInfo>) => {
    console.log('🔄 AuthContext - 사용자 프로필 업데이트:', updates);
    dispatch({ 
      type: AuthActionType.UPDATE_USER_PROFILE, 
      payload: updates 
    });
  };

  // Context value
  const contextValue: AuthContextState = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isCognitoConfigured: cognitoService !== null,
    login,
    logout,
    signUp,
    confirmSignUp,
    resendConfirmationCode,
    forgotPassword,
    confirmPassword,
    refreshSession,
    getGoogleLoginUrl,
    parseAuthCallback,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Export context for advanced usage
export { AuthContext };