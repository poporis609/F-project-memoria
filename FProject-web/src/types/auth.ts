/**
 * Authentication and Cognito related type definitions
 */

// User information from Cognito
export interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: any;
}

// Authentication result from login
export interface AuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  user: CognitoUserInfo;
}

// User information interface
export interface CognitoUserInfo {
  username: string;
  email: string;
  name?: string;
  nickname?: string;
  sub: string;
  emailVerified: boolean;
}

// Cognito configuration
export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  domain: string;
}

// Authentication context state
export interface AuthContextState {
  user: CognitoUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCognitoConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, name: string, nickname: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  getGoogleLoginUrl: () => string;
  parseAuthCallback: (url: string) => Promise<void>;
  updateUserProfile: (updates: Partial<CognitoUserInfo>) => void;
}

// Login form data
export interface LoginFormData {
  email: string;
  password: string;
}

// Sign up form data
export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  nickname: string;
}

// Password reset form data
export interface PasswordResetFormData {
  email: string;
}

// Confirm password reset form data
export interface ConfirmPasswordResetFormData {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Email confirmation form data
export interface EmailConfirmationFormData {
  email: string;
  code: string;
}

// Auth error types
export interface AuthError {
  code: string;
  message: string;
  name: string;
}

// Common auth error codes
export enum AuthErrorCode {
  USER_NOT_FOUND = 'UserNotFoundException',
  INVALID_PASSWORD = 'NotAuthorizedException',
  USER_NOT_CONFIRMED = 'UserNotConfirmedException',
  CODE_MISMATCH = 'CodeMismatchException',
  EXPIRED_CODE = 'ExpiredCodeException',
  LIMIT_EXCEEDED = 'LimitExceededException',
  INVALID_PARAMETER = 'InvalidParameterException',
  USERNAME_EXISTS = 'UsernameExistsException',
  INVALID_PASSWORD_EXCEPTION = 'InvalidPasswordException',
  TOO_MANY_REQUESTS = 'TooManyRequestsException',
  TOO_MANY_FAILED_ATTEMPTS = 'TooManyFailedAttemptsException',
}

// Auth action types for reducers
export enum AuthActionType {
  LOGIN_START = 'LOGIN_START',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SIGNUP_START = 'SIGNUP_START',
  SIGNUP_SUCCESS = 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE = 'SIGNUP_FAILURE',
  CONFIRM_SIGNUP_START = 'CONFIRM_SIGNUP_START',
  CONFIRM_SIGNUP_SUCCESS = 'CONFIRM_SIGNUP_SUCCESS',
  CONFIRM_SIGNUP_FAILURE = 'CONFIRM_SIGNUP_FAILURE',
  FORGOT_PASSWORD_START = 'FORGOT_PASSWORD_START',
  FORGOT_PASSWORD_SUCCESS = 'FORGOT_PASSWORD_SUCCESS',
  FORGOT_PASSWORD_FAILURE = 'FORGOT_PASSWORD_FAILURE',
  CONFIRM_PASSWORD_START = 'CONFIRM_PASSWORD_START',
  CONFIRM_PASSWORD_SUCCESS = 'CONFIRM_PASSWORD_SUCCESS',
  CONFIRM_PASSWORD_FAILURE = 'CONFIRM_PASSWORD_FAILURE',
  REFRESH_SESSION_START = 'REFRESH_SESSION_START',
  REFRESH_SESSION_SUCCESS = 'REFRESH_SESSION_SUCCESS',
  REFRESH_SESSION_FAILURE = 'REFRESH_SESSION_FAILURE',
  SET_LOADING = 'SET_LOADING',
  CLEAR_ERROR = 'CLEAR_ERROR',
  UPDATE_USER_PROFILE = 'UPDATE_USER_PROFILE',
}

// Auth action interfaces
export interface AuthAction {
  type: AuthActionType;
  payload?: any;
}

// Protected route props
export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

// Auth guard props
export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}