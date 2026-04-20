/**
 * Cognito Configuration
 * 
 * Centralized configuration for AWS Cognito authentication
 */

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  domain: string;
}

export interface OAuthConfig {
  domain: string;
  scope: string[];
  redirectSignIn: string;
  redirectSignOut: string;
  responseType: 'code' | 'token';
}

/**
 * Load Cognito configuration from environment variables
 */
export const getCognitoConfig = (): CognitoConfig | null => {
  const region = import.meta.env.VITE_COGNITO_REGION;
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;

  if (!region || !userPoolId || !clientId || !domain) {
    return null;
  }

  return {
    region,
    userPoolId,
    clientId,
    domain,
  };
};

/**
 * OAuth configuration for Google login
 */
export const getOAuthConfig = (): OAuthConfig => {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN || '';
  const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;

  return {
    domain,
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: redirectUri,
    redirectSignOut: `${window.location.origin}/auth`,
    responseType: 'code',
  };
};

/**
 * Check if Cognito is properly configured
 */
export const isCognitoConfigured = (): boolean => {
  return getCognitoConfig() !== null;
};

/**
 * AWS configuration (for compatibility)
 */
export const getAWSConfig = () => {
  const config = getCognitoConfig();
  
  if (!config) {
    return null;
  }

  return {
    region: config.region,
    userPoolId: config.userPoolId,
    userPoolWebClientId: config.clientId,
    cognitoDomain: config.domain,
  };
};

// Export default config getter
export default getCognitoConfig;
