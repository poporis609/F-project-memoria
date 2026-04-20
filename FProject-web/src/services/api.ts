// 📁 최종 배포용: src/services/api.ts
// API 서비스 - 백엔드와의 통신

import { LibraryItem, LibraryItemType, LibraryItemVisibility } from "@/types/library";

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_LIBRARY_API_PREFIX || "/library"}`;

// API 응답 타입
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiLibraryItem {
  id: string;
  name: string;
  type: LibraryItemType;
  visibility: LibraryItemVisibility;
  created_at: string;
  file_size?: number;
  preview_text?: string | null;
  file_url?: string | null;
  thumbnail_url?: string | null;
  preview_url?: string | null;  // 동영상 프리뷰 URL
  subtitle_url?: string | null; // 자막 파일 URL
  mime_type?: string | null;    // MIME 타입 (백엔드에서 제공 시)
}

interface PresignedUrlResponse {
  upload_url: string;
  s3_key: string;
  expires_in: number;
  fields?: Record<string, string>;
  file_info?: {
    item_type: LibraryItemType;
    formatted_size: string;
    needs_thumbnail: boolean;
  };
}

interface CreateItemRequest {
  name: string;
  type: LibraryItemType;
  visibility: LibraryItemVisibility;
  mime_type: string;
  s3_key: string;
  s3_thumbnail_key?: string;
  file_size: number;
  original_filename: string;
  preview_text?: string;
}

// S3 설정 - 환경변수에서 가져오기
const S3_BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME || "library-test-youk";
const S3_REGION = import.meta.env.VITE_S3_REGION || "ap-northeast-2";

class ApiService {
  private getAuthHeaders(): HeadersInit {
    // Cognito 토큰 가져오기
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    
    if (!clientId) {
      console.warn('VITE_COGNITO_CLIENT_ID가 설정되지 않았습니다');
      return {
        "Content-Type": "application/json",
      };
    }
    
    // localStorage에서 Cognito 토큰 찾기
    const cognitoKeys = Object.keys(localStorage).filter(key => 
      key.includes('CognitoIdentityServiceProvider') && 
      key.includes(clientId) &&
      key.endsWith('.idToken')
    );
    
    const token = cognitoKeys.length > 0 ? localStorage.getItem(cognitoKeys[0]) : null;
    
    if (!token) {
      console.warn('⚠️ ApiService - Cognito 토큰을 찾을 수 없습니다');
    }
    
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // S3 키로 파일 URL 가져오기 (백엔드 API 사용)
  async getFileUrlFromS3Key(s3Key: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/library-items/url-by-key?s3_key=${encodeURIComponent(s3Key)}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        console.error(`S3 URL 조회 실패: ${response.status}`);
        return null;
      }

      const result = await response.json();
      const fileUrl = result.data?.file_url || result.file_url || null;
      
      // 백엔드가 잘못된 도메인으로 URL을 생성하는 경우 수정
      if (fileUrl) {
        return fileUrl.replace('https://library.aws11.shop/api/v1', `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_LIBRARY_API_PREFIX || "/library"}`);
      }
      
      return null;
    } catch (error) {
      console.error('S3 URL 조회 중 오류:', error);
      return null;
    }
  }

  // Presigned URL 요청
  async getPresignedUrl(
    filename: string,
    contentType: string,
    fileSize: number
  ): Promise<PresignedUrlResponse> {
    const response = await fetch(`${API_BASE_URL}/upload/presigned-url`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        filename,
        content_type: contentType,
        file_size: fileSize,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Presigned URL 생성 실패");
    }

    const result: ApiResponse<PresignedUrlResponse> = await response.json();
    return result.data;
  }

  // S3에 파일 업로드
  async uploadToS3(
    file: File,
    presignedData: PresignedUrlResponse,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      
      // Presigned POST의 필드들 추가
      if (presignedData.fields) {
        Object.entries(presignedData.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      // 파일을 마지막에 추가
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      // 진행률 추적
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`업로드 실패: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("네트워크 오류로 업로드 실패"));
      });

      xhr.open("POST", presignedData.upload_url);
      xhr.send(formData);
    });
  }

  // 라이브러리 아이템 생성
  async createLibraryItem(itemData: CreateItemRequest): Promise<LibraryItem> {
    const response = await fetch(`${API_BASE_URL}/library-items/`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "아이템 생성 실패");
    }

    const result: ApiResponse<ApiLibraryItem> = await response.json();
    return this.mapLibraryItem(result.data);
  }

  // 내 라이브러리 아이템 목록 조회
  async getMyLibraryItems(
    page: number = 1,
    size: number = 20,
    itemType?: LibraryItemType,
    search?: string
  ): Promise<{ items: LibraryItem[]; total: number }> {
    const params = new URLSearchParams({
      skip: ((page - 1) * size).toString(),
      limit: size.toString(),
    });

    if (itemType) params.append("item_type", itemType);
    if (search) params.append("search", search);

    const response = await fetch(`${API_BASE_URL}/library-items/?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "아이템 목록 조회 실패");
    }

    const result = await response.json();
    return {
      items: (result.data as ApiLibraryItem[]).map((item) => this.mapLibraryItem(item)),
      total: result.pagination?.total || result.data.length,
    };
  }

  // 라이브러리 아이템 삭제
  async deleteLibraryItem(itemId: string, permanent: boolean = false): Promise<void> {
    const params = permanent ? "?permanent=true" : "";
    const response = await fetch(`${API_BASE_URL}/library-items/${itemId}${params}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "아이템 삭제 실패");
    }
  }

  // 라이브러리 아이템 수정
  async updateLibraryItem(
    itemId: string,
    updates: { name?: string; visibility?: LibraryItemVisibility; preview_text?: string }
  ): Promise<LibraryItem> {
    const response = await fetch(`${API_BASE_URL}/library-items/${itemId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "아이템 수정 실패");
    }

    const result: ApiResponse<ApiLibraryItem> = await response.json();
    return this.mapLibraryItem(result.data);
  }

  // 파일 타입 감지
  getFileType(file: File): LibraryItemType {
    const mimeType = file.type;
    
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (
      mimeType === "application/pdf" ||
      mimeType.includes("document") ||
      mimeType.includes("text") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    ) {
      return "document";
    }
    
    return "file";
  }

  // 전체 업로드 프로세스
  async uploadFile(
    file: File,
    name: string,
    visibility: LibraryItemVisibility,
    onProgress?: (progress: number) => void
  ): Promise<LibraryItem> {
    try {
      // 1. Presigned URL 요청
      onProgress?.(10);
      const presignedData = await this.getPresignedUrl(
        file.name,
        file.type,
        file.size
      );

      // 2. S3에 파일 업로드
      await this.uploadToS3(file, presignedData, (uploadProgress) => {
        // 10% ~ 80%를 업로드 진행률로 할당
        onProgress?.(10 + (uploadProgress * 0.7));
      });

      onProgress?.(85);

      // 3. 데이터베이스에 메타데이터 저장
      const itemType = presignedData.file_info?.item_type || this.getFileType(file);
      
      const itemData: CreateItemRequest = {
        name: name || file.name,
        type: itemType,
        visibility,
        mime_type: file.type,
        s3_key: presignedData.s3_key,
        file_size: file.size,
        original_filename: file.name,
      };

      const createdItem = await this.createLibraryItem(itemData);
      
      onProgress?.(100);
      
      return createdItem;
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      throw error;
    }
  }

  private mapLibraryItem(item: ApiLibraryItem): LibraryItem {
    // 백엔드가 잘못된 도메인으로 URL을 생성하는 경우 수정
    const fixUrl = (url: string | null | undefined): string | undefined => {
      if (!url) return undefined;
      return url.replace('https://library.aws11.shop/api/v1', `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_LIBRARY_API_PREFIX || "/library"}`);
    };

    // 타입별로 썸네일 처리
    let thumbnailUrl: string | undefined;
    if (item.type === "image") {
      // 이미지: file_url을 썸네일로 사용
      thumbnailUrl = fixUrl(item.file_url);
    } else if (item.type === "video") {
      // 동영상: thumbnail_url만 사용 (없으면 undefined = "썸네일 생성중" 표시)
      thumbnailUrl = fixUrl(item.thumbnail_url);
    } else {
      // document, file: 썸네일 없음
      thumbnailUrl = undefined;
    }

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      visibility: item.visibility,
      thumbnail: thumbnailUrl,
      preview: item.preview_text || undefined,
      previewUrl: fixUrl(item.preview_url) || undefined,  // 동영상 프리뷰 URL
      fileUrl: fixUrl(item.file_url) || undefined,        // 원본 파일 URL (동영상 재생용)
      subtitleUrl: fixUrl(item.subtitle_url) || undefined, // 자막 파일 URL
      createdAt: new Date(item.created_at),
      size: item.file_size,
    };
  }
}

export const apiService = new ApiService();