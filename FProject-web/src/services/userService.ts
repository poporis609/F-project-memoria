/**
 * User Service for managing user data in database
 * Handles user profile synchronization with Cognito
 */

import { CognitoUserInfo } from '@/types/auth';
import { formatUserForDB } from '@/utils/userUtils';

export interface DBUser {
  id?: number;
  cognito_sub: string;
  email: string;
  name: string;
  nickname: string;
  username: string;
  email_verified: boolean;
  profile_image_url?: string;
  bio?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
  }

  /**
   * Get user from database by Cognito sub
   */
  async getUserBySub(cognitoSub: string): Promise<DBUser | null> {
    const response = await fetch(`${this.apiBaseUrl}/users/cognito/${cognitoSub}`, {
      headers: {
        'Accept': 'application/json; charset=utf-8',
      },
    });
    
    if (response.status === 404) {
      return null; // User not found in DB
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    
    // Ensure response is decoded as UTF-8
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Create new user in database
   */
  async createUser(cognitoUser: CognitoUserInfo): Promise<DBUser> {
    const userData = formatUserForDB(cognitoUser);
    
    const response = await fetch(`${this.apiBaseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }
    
    // Ensure response is decoded as UTF-8
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Update existing user in database
   */
  async updateUser(cognitoSub: string, updates: Partial<DBUser>): Promise<DBUser> {
    const response = await fetch(`${this.apiBaseUrl}/users/cognito/${cognitoSub}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }
    
    // Ensure response is decoded as UTF-8
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Sync Cognito user with database
   * Creates user if not exists, updates if exists
   */
  async syncUser(cognitoUser: CognitoUserInfo): Promise<DBUser> {
    const existingUser = await this.getUserBySub(cognitoUser.sub);
    
    if (existingUser) {
      // Update existing user with latest Cognito data
      const updates = {
        email: cognitoUser.email,
        name: cognitoUser.name || existingUser.name,
        nickname: cognitoUser.nickname || existingUser.nickname,
        username: cognitoUser.username || existingUser.username,
        email_verified: cognitoUser.emailVerified,
      };
      
      return await this.updateUser(cognitoUser.sub, updates);
    } else {
      // Create new user
      return await this.createUser(cognitoUser);
    }
  }

  /**
   * Get user profile with additional data
   */
  async getUserProfile(cognitoSub: string): Promise<DBUser | null> {
    const response = await fetch(`${this.apiBaseUrl}/users/cognito/${cognitoSub}/profile`, {
      headers: {
        'Accept': 'application/json; charset=utf-8',
      },
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }
    
    // Ensure response is decoded as UTF-8
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Update user profile image
   */
  async updateProfileImage(cognitoSub: string, imageUrl: string): Promise<DBUser> {
    try {
      return await this.updateUser(cognitoSub, {
        profile_image_url: imageUrl,
      });
    } catch (error) {
      console.error('Error updating profile image:', error);
      throw error;
    }
  }

  /**
   * Delete user from database (soft delete)
   */
  async deleteUser(cognitoSub: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/cognito/${cognitoSub}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

// Singleton instance
let userServiceInstance: UserService | null = null;

export function getUserService(apiBaseUrl?: string): UserService {
  if (!userServiceInstance) {
    userServiceInstance = new UserService(apiBaseUrl);
  }
  return userServiceInstance;
}

export default UserService;