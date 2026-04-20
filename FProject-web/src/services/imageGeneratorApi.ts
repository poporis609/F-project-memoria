// Image Generator API 서비스
// AI 이미지 생성 API와 통신

const IMAGE_GENERATOR_API_URL = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.IMAGE_API_PREFIX || "/image"}`;

export interface GenerateImageResponse {
  success: boolean;
  data: {
    historyId: number;
    userId: string;
    imageGenerated: boolean;
    alreadyHadImage: boolean;
    s3Key: string;
    textKey: string;
    imageUrl: string;
    textUrl: string;
  };
  error?: string;
}

export interface PreviewImageResponse {
  success: boolean;
  data: {
    historyId: number;
    userId: string;
    imageBase64: string;
    prompt: {
      positive: string;
      negative: string;
    };
  };
  error?: string;
}

export interface ConfirmImageResponse {
  success: boolean;
  data: {
    historyId: number;
    userId: string;
    s3Key: string;
    textKey: string;
    imageUrl: string;
    textUrl: string;
  };
  error?: string;
}

export interface DirectGenerateImageResponse {
  success: boolean;
  data: {
    imageBase64: string;
    prompt: {
      positive: string;
      negative: string;
    };
  };
  error?: string;
}

class ImageGeneratorApiService {
  private getAuthHeaders(): HeadersInit {
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    
    if (!clientId) {
      return { "Content-Type": "application/json" };
    }
    
    const cognitoKeys = Object.keys(localStorage).filter(key => 
      key.includes('CognitoIdentityServiceProvider') && 
      key.includes(clientId) &&
      key.endsWith('.idToken')
    );
    
    const token = cognitoKeys.length > 0 ? localStorage.getItem(cognitoKeys[0]) : null;
    
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // 특정 History에 이미지 생성 (바로 S3/DB 저장)
  async generateImageForHistory(historyId: number | string): Promise<GenerateImageResponse> {
    const response = await fetch(`${IMAGE_GENERATOR_API_URL}/histories/${historyId}/generate-image`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '이미지 생성 실패' }));
      throw new Error(error.error || `이미지 생성 실패: ${response.status}`);
    }

    return response.json();
  }

  // 이미지 미리보기 생성 (S3/DB 저장 안 함)
  async previewImageForHistory(historyId: number | string, text: string): Promise<PreviewImageResponse> {
    const response = await fetch(`${IMAGE_GENERATOR_API_URL}/histories/${historyId}/preview-image`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '이미지 미리보기 생성 실패' }));
      throw new Error(error.error || `이미지 미리보기 생성 실패: ${response.status}`);
    }

    return response.json();
  }

  // 이미지 확정 저장 (S3/DB에 저장)
  async confirmImageForHistory(historyId: number | string, imageBase64: string, userId: string, recordDate: string): Promise<ConfirmImageResponse> {
    const response = await fetch(`${IMAGE_GENERATOR_API_URL}/histories/${historyId}/confirm-image`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ 
        imageBase64,
        userId,
        recordDate
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '이미지 저장 실패' }));
      throw new Error(error.error || `이미지 저장 실패: ${response.status}`);
    }

    return response.json();
  }

  // 텍스트로 직접 이미지 생성 (S3 저장 안됨)
  async generateImageFromText(text: string): Promise<DirectGenerateImageResponse> {
    const response = await fetch(`${IMAGE_GENERATOR_API_URL}/generate-image`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '이미지 생성 실패' }));
      throw new Error(error.error || `이미지 생성 실패: ${response.status}`);
    }

    return response.json();
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${IMAGE_GENERATOR_API_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const imageGeneratorApi = new ImageGeneratorApiService();
