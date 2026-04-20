import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Cognito 설정 인터페이스
export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  domain: string;
}

// 사용자 정보 인터페이스
export interface CognitoUserInfo {
  username: string;
  email: string;
  name?: string;
  nickname?: string;
  sub: string;
  emailVerified: boolean;
}

// 인증 결과 인터페이스
export interface AuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  user: CognitoUserInfo;
}

class CognitoService {
  private userPool: CognitoUserPool;
  private config: CognitoConfig;

  constructor(config: CognitoConfig) {
    this.config = config;

    // User Pool 초기화
    this.userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
    });
  }

  /**
   * 환경 변수에서 Cognito 설정을 로드하고 검증합니다
   */
  static loadConfigFromEnv(): CognitoConfig | null {
    const region = import.meta.env.VITE_COGNITO_REGION;
    const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const domain = import.meta.env.VITE_COGNITO_DOMAIN;

    // 디버깅용 환경 변수 로드 확인
    console.log('환경 변수 로드 시도:', {
      region,
      userPoolId,
      clientId,
      domain,
    });

    // 필수 환경 변수 검증
    if (!region || !userPoolId || !clientId || !domain) {
      const missing = [];
      if (!region) missing.push('VITE_COGNITO_REGION');
      if (!userPoolId) missing.push('VITE_COGNITO_USER_POOL_ID');
      if (!clientId) missing.push('VITE_COGNITO_CLIENT_ID');
      if (!domain) missing.push('VITE_COGNITO_DOMAIN');

      console.warn(
        `Cognito 환경 변수가 설정되지 않았습니다: ${missing.join(', ')}`
      );
      
      // null을 반환하여 Cognito 서비스를 비활성화
      return null;
    }

    return {
      region,
      userPoolId,
      clientId,
      domain,
    };
  }

  /**
   * 회원가입
   */
  async signUp(email: string, password: string, name: string, nickname: string): Promise<void> {
    console.log('🔷 회원가입 시도:', { email, name, nickname });

    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: email,
        }),
        new CognitoUserAttribute({
          Name: 'name',
          Value: name,
        }),
        new CognitoUserAttribute({
          Name: 'preferred_username',
          Value: nickname,
        }),
      ];

      console.log('🔷 Cognito signUp 요청 중..');

      this.userPool.signUp(
        email,
        password,
        attributeList,
        [],
        (err, result) => {
          if (err) {
            console.error('🔶 회원가입 실패:', err);
            console.error('🔶 에러 코드:', (err as any).code);
            console.error('🔶 에러 메시지:', err.message);
            reject(err);
            return;
          }
          console.log('✅ 회원가입 성공:', result);
          console.log('✅ 사용자 확인 필요:', result?.userConfirmed);
          console.log('✅ CodeDeliveryDetails:', result?.codeDeliveryDetails);
          resolve();
        }
      );
    });
  }

  /**
   * 이메일 인증
   */
  async confirmSignUp(email: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 인증 코드 재전송
   */
  async resendConfirmationCode(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          console.error('인증 코드 재전송 에러:', err);
          reject(err);
          return;
        }
        console.log('인증 코드 재전송 성공:', result);
        resolve();
      });
    });
  }

  /**
   * 로그인
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const userData = {
        Username: email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const idToken = session.getIdToken();
          const accessToken = session.getAccessToken();
          const refreshToken = session.getRefreshToken();

          // ID 토큰에서 사용자 정보 추출
          const payload = idToken.payload;

          const authResult: AuthResult = {
            accessToken: accessToken.getJwtToken(),
            idToken: idToken.getJwtToken(),
            refreshToken: refreshToken.getToken(),
            user: {
              username: payload['cognito:username'],
              email: payload.email,
              name: payload.name,
              nickname: payload['preferred_username'],
              sub: payload.sub,
              emailVerified: payload.email_verified,
            },
          };

          resolve(authResult);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * 현재 세션 가져오기
   */
  async getCurrentSession(): Promise<AuthResult | null> {
    return new Promise((resolve) => {
      console.log('🔍 getCurrentSession: 현재 사용자 확인 중...');
      
      // localStorage의 모든 Cognito 관련 키 출력
      const allKeys = Object.keys(localStorage);
      const cognitoKeys = allKeys.filter(k => k.includes('Cognito'));
      console.log('📋 localStorage의 Cognito 키들:', cognitoKeys);
      
      const cognitoUser = this.userPool.getCurrentUser();

      if (!cognitoUser) {
        console.log('ℹ️ getCurrentSession: 현재 사용자 없음');
        console.log('💡 userPool 정보:', {
          userPoolId: this.userPool.getUserPoolId(),
          clientId: this.userPool.getClientId()
        });
        resolve(null);
        return;
      }

      console.log('🔍 getCurrentSession: 사용자 발견, 세션 확인 중...');
      console.log('👤 사용자 정보:', cognitoUser.getUsername());
      
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          console.error('❌ getCurrentSession: 세션 가져오기 실패:', err);
          resolve(null);
          return;
        }
        
        if (!session) {
          console.log('ℹ️ getCurrentSession: 세션 없음');
          resolve(null);
          return;
        }
        
        if (!session.isValid()) {
          console.log('⚠️ getCurrentSession: 세션 만료됨');
          resolve(null);
          return;
        }

        console.log('✅ getCurrentSession: 유효한 세션 발견!');
        const idToken = session.getIdToken();
        const accessToken = session.getAccessToken();
        const refreshToken = session.getRefreshToken();
        const payload = idToken.payload;

        console.log('📋 사용자 정보:', {
          email: payload.email,
          name: payload.name,
          nickname: payload['preferred_username']
        });

        const authResult: AuthResult = {
          accessToken: accessToken.getJwtToken(),
          idToken: idToken.getJwtToken(),
          refreshToken: refreshToken.getToken(),
          user: {
            username: payload['cognito:username'],
            email: payload.email,
            name: payload.name,
            nickname: payload['preferred_username'],
            sub: payload.sub,
            emailVerified: payload.email_verified,
          },
        };

        resolve(authResult);
      });
    });
  }

  /**
   * 토큰 갱신
   */
  async refreshSession(): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      const cognitoUser = this.userPool.getCurrentUser();

      if (!cognitoUser) {
        reject(new Error('No current user'));
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          reject(err || new Error('No session'));
          return;
        }

        const refreshTokenObj = session.getRefreshToken();

        cognitoUser.refreshSession(refreshTokenObj, (err, session) => {
          if (err) {
            reject(err);
            return;
          }

          const idToken = session.getIdToken();
          const accessToken = session.getAccessToken();
          const refreshToken = session.getRefreshToken();
          const payload = idToken.payload;

          const authResult: AuthResult = {
            accessToken: accessToken.getJwtToken(),
            idToken: idToken.getJwtToken(),
            refreshToken: refreshToken.getToken(),
            user: {
              username: payload['cognito:username'],
              email: payload.email,
              name: payload.name,
              nickname: payload['preferred_username'],
              sub: payload.sub,
              emailVerified: payload.email_verified,
            },
          };

          resolve(authResult);
        });
      });
    });
  }

  /**
   * Google 로그인 URL 생성
   */
  getGoogleLoginUrl(): string {
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI;

    if (!redirectUri) {
      throw new Error('VITE_OAUTH_REDIRECT_URI 환경 변수가 설정되지 않았습니다');
    }

    const url = new URL(`https://${this.config.domain}/oauth2/authorize`);
    url.searchParams.append('client_id', this.config.clientId);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', 'openid email profile');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('identity_provider', 'Google');

    return url.toString();
  }

  /**
   * OAuth 콜백에서 토큰 파싱 (재시도 로직 포함)
   */
  async parseAuthCallback(url: string): Promise<AuthResult> {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('Authorization code not found in callback URL');
    }

    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI;

    if (!redirectUri) {
      throw new Error('VITE_OAUTH_REDIRECT_URI 환경 변수가 설정되지 않았습니다');
    }

    console.log('🔍 parseAuthCallback 시작');
    console.log('- 코드:', code.substring(0, 10) + '...');
    console.log('- 리다이렉트 URI:', redirectUri);

    // 토큰 교환 (재시도 로직 포함)
    const tokens = await this.exchangeCodeForTokens(code, redirectUri);

    // ID 토큰 디코딩하여 사용자 정보 추출
    const idTokenPayload = this.decodeJWT(tokens.id_token);

    const username = idTokenPayload['cognito:username'];
    
    // 토큰을 localStorage에 수동으로 저장 (Cognito SDK 형식)
    const keyPrefix = `CognitoIdentityServiceProvider.${this.config.clientId}`;
    const lastUserKey = `${keyPrefix}.LastAuthUser`;
    const idTokenKey = `${keyPrefix}.${username}.idToken`;
    const accessTokenKey = `${keyPrefix}.${username}.accessToken`;
    const refreshTokenKey = `${keyPrefix}.${username}.refreshToken`;
    const clockDriftKey = `${keyPrefix}.${username}.clockDrift`;
    
    console.log('💾 토큰을 localStorage에 저장 중...');
    localStorage.setItem(lastUserKey, username);
    localStorage.setItem(idTokenKey, tokens.id_token);
    localStorage.setItem(accessTokenKey, tokens.access_token);
    localStorage.setItem(refreshTokenKey, tokens.refresh_token);
    localStorage.setItem(clockDriftKey, '0');
    console.log('✅ 토큰 저장 완료!');

    const authResult: AuthResult = {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      user: {
        username: username,
        email: idTokenPayload.email,
        name: idTokenPayload.name,
        nickname: idTokenPayload['preferred_username'],
        sub: idTokenPayload.sub,
        emailVerified: idTokenPayload.email_verified,
      },
    };

    console.log('✅ parseAuthCallback 완료');
    return authResult;
  }

  /**
   * Authorization code를 토큰으로 교환 (재시도 로직 포함)
   */
  private async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    maxRetries: number = 3
  ): Promise<any> {
    const tokenUrl = `https://${this.config.domain}/oauth2/token`;

    console.log('🔍 토큰 교환 디버깅 정보:');
    console.log('- 토큰 URL:', tokenUrl);
    console.log('- 리다이렉트 URI:', redirectUri);
    console.log('- 클라이언트 ID:', this.config.clientId);
    console.log('- 코드 (앞 10자):', code.substring(0, 10) + '...');

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', this.config.clientId);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`토큰 교환 시도 ${attempt}/${maxRetries}...`);

        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ 토큰 교환 실패 응답:', errorText);

          // "Application is busy" 에러인 경우 재시도
          if (errorText.includes('Application is busy') && attempt < maxRetries) {
            console.warn(`서버가 바쁩니다. ${attempt + 1}번째 시도 대기중..`);
            // 지수 백오프: 1초, 2초, 4초
            await this.sleep(1000 * Math.pow(2, attempt - 1));
            continue;
          }

          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokens = await response.json();
        console.log('✅ 토큰 교환 성공!');
        return tokens;

      } catch (error: any) {
        lastError = error;
        console.error(`❌ 토큰 교환 시도 ${attempt} 실패:`, error.message);

        // 마지막 시도가 아니고 재시도 가능한 에러인 경우
        if (attempt < maxRetries && error.message.includes('Application is busy')) {
          console.warn(`재시도 ${attempt}/${maxRetries} 실패. 다시 시도중..`);
          await this.sleep(1000 * Math.pow(2, attempt - 1));
          continue;
        }

        // 재시도 불가능한 에러이거나 마지막 시도인 경우
        throw error;
      }
    }

    // 모든 재시도 실패
    throw lastError || new Error('Token exchange failed after all retries');
  }

  /**
   * 지정된 시간만큼 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * JWT 토큰 디코딩 (페이로드만) - UTF-8 지원
   */
  private decodeJWT(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token');
    }

    const payload = parts[1];
    // base64url을 base64로 변환
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // atob()는 Latin-1만 지원하므로 UTF-8 디코딩을 위해 TextDecoder 사용
    try {
      // base64 디코딩
      const binaryString = atob(base64);
      // binary string을 Uint8Array로 변환
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // UTF-8 디코딩
      const decoder = new TextDecoder('utf-8');
      const decodedString = decoder.decode(bytes);
      return JSON.parse(decodedString);
    } catch (error) {
      console.error('JWT 디코딩 실패:', error);
      throw new Error('Failed to decode JWT token');
    }
  }

  /**
   * 비밀번호 재설정 요청
   */
  async forgotPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * 비밀번호 재설정 확인
   */
  async confirmPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<void> {
    return new Promise((resolve) => {
      const cognitoUser = this.userPool.getCurrentUser();

      if (cognitoUser) {
        cognitoUser.signOut();
      }

      resolve();
    });
  }
}

// 싱글톤 인스턴스 생성
let cognitoServiceInstance: CognitoService | null = null;
let cognitoConfigured = false;

export function getCognitoService(): CognitoService | null {
  if (!cognitoServiceInstance && !cognitoConfigured) {
    try {
      const config = CognitoService.loadConfigFromEnv();
      
      if (config) {
        cognitoServiceInstance = new CognitoService(config);
        console.log('✅ Cognito 서비스가 성공적으로 초기화되었습니다.');
      } else {
        console.warn('⚠️ Cognito 설정이 없어 인증 기능이 비활성화됩니다.');
      }
      
      cognitoConfigured = true;
    } catch (error) {
      console.error('❌ Cognito 서비스 초기화 실패:', error);
      cognitoConfigured = true;
    }
  }
  
  return cognitoServiceInstance;
}

export function isCognitoConfigured(): boolean {
  return cognitoServiceInstance !== null;
}

export default CognitoService;