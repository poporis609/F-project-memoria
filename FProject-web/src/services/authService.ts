/**
 * Auth Service Module
 *
 * Handles AWS Cognito authentication operations including:
 * - JWT token verification
 * - User attribute updates
 * - Password reset
 * - User deletion from Cognito
 *
 * Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 10.9
 */

import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * Cognito User Interface
 */
export interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  preferred_username?: string;
  [key: string]: any;
}

/**
 * Auth Service Error Types
 */
export class TokenVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenVerificationError';
  }
}

export class TokenExpiredError extends Error {
  constructor() {
    super('Token has expired');
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super('Invalid token');
    this.name = 'InvalidTokenError';
  }
}

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

export class CognitoError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CognitoError';
  }
}

/**
 * Password validation utility
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
 * Auth Service Class
 */
export class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private jwksClient: jwksClient.JwksClient;
  private userPoolId: string;
  private region: string;
  private clientId: string;

  constructor() {
    this.region = import.meta.env.VITE_AWS_REGION || import.meta.env.VITE_COGNITO_REGION || 'ap-northeast-2';
    this.userPoolId = import.meta.env.VITE_AWS_USER_POOL_ID || import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
    this.clientId = import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID || '';

    if (!this.userPoolId || !this.clientId) {
      throw new Error('Cognito configuration missing: USER_POOL_ID or CLIENT_ID not set');
    }

    // Initialize Cognito client
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.region,
    });

    // Initialize JWKS client for token verification
    const jwksUri = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`;
    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  /**
   * Verify JWT token from Cognito
   *
   * Verifies the token signature, expiration, and extracts user information.
   *
   * @param token - JWT token from Authorization header
   * @returns Decoded user information
   * @throws TokenExpiredError if token is expired
   * @throws InvalidTokenError if token is invalid
   * @throws TokenVerificationError for other verification errors
   *
   * Requirements: 10.9
   */
  async verifyToken(token: string): Promise<CognitoUser> {
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      // Decode token header to get kid (key id)
      const decodedHeader = jwt.decode(cleanToken, { complete: true });

      if (!decodedHeader || typeof decodedHeader === 'string') {
        throw new InvalidTokenError();
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        throw new InvalidTokenError();
      }

      // Get signing key from JWKS
      const key = await this.jwksClient.getSigningKey(kid);
      const signingKey = key.getPublicKey();

      // Verify token
      const decoded = jwt.verify(cleanToken, signingKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
      }) as CognitoUser;

      // Verify token_use is 'id' or 'access'
      if (decoded.token_use !== 'id' && decoded.token_use !== 'access') {
        throw new InvalidTokenError();
      }

      return decoded;

    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredError();
      }
      if (error.name === 'JsonWebTokenError') {
        throw new InvalidTokenError();
      }
      if (error instanceof TokenExpiredError || error instanceof InvalidTokenError) {
        throw error;
      }
      throw new TokenVerificationError(error.message || 'Token verification failed');
    }
  }

  /**
   * Update Cognito user attribute
   *
   * Updates a user attribute in Cognito User Pool.
   * Commonly used to update preferred_username when nickname changes.
   *
   * @param userId - Cognito user ID (sub)
   * @param attributeName - Attribute name (e.g., 'preferred_username')
   * @param value - New attribute value
   * @throws CognitoError if update fails
   *
   * Requirements: 4.1
   */
  async updateCognitoAttribute(
    userId: string,
    attributeName: string,
    value: string
  ): Promise<void> {
    try {
      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: attributeName,
            Value: value,
          },
        ],
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      throw new CognitoError(
        `Failed to update Cognito attribute: ${error.message}`,
        error.name
      );
    }
  }

  /**
   * Initiate password reset
   *
   * Sends a password reset code to the user's email.
   *
   * @param email - User email address
   * @throws CognitoError if operation fails
   * 
   * Requirements: 5.1, 5.2
   */
  async initiatePasswordReset(email: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      throw new CognitoError(
        `Failed to initiate password reset: ${error.message}`,
        error.name
      );
    }
  }

  /**
   * Confirm password reset
   *
   * Confirms password reset with verification code and new password.
   * Validates password strength before sending to Cognito.
   *
   * @param email - User email address
   * @param code - Verification code from email
   * @param newPassword - New password
   * @throws PasswordValidationError if password doesn't meet requirements
   * @throws CognitoError if operation fails
   *
   * Requirements: 5.2, 5.3, 5.4, 5.5
   */
  async confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    // Validate password strength
    if (!isValidPassword(newPassword)) {
      throw new PasswordValidationError(
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      );
    }

    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      if (error.name === 'CodeMismatchException') {
        throw new CognitoError('Invalid or expired verification code', error.name);
      }
      if (error.name === 'ExpiredCodeException') {
        throw new CognitoError('Verification code has expired', error.name);
      }
      throw new CognitoError(
        `Failed to confirm password reset: ${error.message}`,
        error.name
      );
    }
  }

  /**
   * Delete user from Cognito
   *
   * Permanently deletes a user from Cognito User Pool.
   * This should be called after soft-deleting from PostgreSQL.
   *
   * @param userId - Cognito user ID (sub)
   * @throws CognitoError if deletion fails
   *
   * Requirements: 6.3
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: userId,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      throw new CognitoError(
        `Failed to delete user from Cognito: ${error.message}`,
        error.name
      );
    }
  }

  /**
   * Get user from Cognito
   *
   * Retrieves user information from Cognito User Pool.
   * Useful for verifying user exists before operations.
   *
   * @param userId - Cognito user ID (sub) or username
   * @returns User attributes
   * @throws CognitoError if user not found or operation fails
   */
  async getUser(userId: string): Promise<any> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: userId,
      });

      const response = await this.cognitoClient.send(command);

      // Convert attributes array to object
      const attributes: any = {};
      if (response.UserAttributes) {
        for (const attr of response.UserAttributes) {
          if (attr.Name && attr.Value) {
            attributes[attr.Name] = attr.Value;
          }
        }
      }

      return {
        username: response.Username,
        userStatus: response.UserStatus,
        enabled: response.Enabled,
        attributes,
      };
    } catch (error: any) {
      throw new CognitoError(
        `Failed to get user from Cognito: ${error.message}`,
        error.name
      );
    }
  }

  /**
   * Extract user ID from token
   *
   * Helper method to extract user ID (sub) from JWT token.
   *
   * @param token - JWT token
   * @returns User ID (sub)
   */
  async getUserIdFromToken(token: string): Promise<string> {
    const user = await this.verifyToken(token);
    return user.sub;
  }
}

/**
 * Singleton instance
 */
let authServiceInstance: AuthService | null = null;

/**
 * Get AuthService instance
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}