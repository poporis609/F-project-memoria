import { FlowRequest, FlowResponse } from "@/types/flow";

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  created_at: Date;
}

export class JournalApiService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  // 사용자 메시지 로드
  async loadUserEntries(userId: string, limit: number = 100, offset: number = 0): Promise<JournalEntry[]> {
    const apiUrl = `${this.apiBaseUrl}/messages?user_id=${userId}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
    }
    
    const messages = await response.json();
    
    // API 응답의 created_at을 Date 객체로 변환
    return messages.map((msg: any) => ({
      ...msg,
      created_at: new Date(msg.created_at)
    }));
  }

  // 메시지 직접 생성 (날짜 커스텀 가능)
  async createMessage(userId: string, content: string, createdAt?: string): Promise<JournalEntry> {
    const response = await fetch(`${this.apiBaseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        content: content,
        created_at: createdAt || new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  // Flow API를 통한 입력 처리
  async processEntry(flowRequest: FlowRequest): Promise<FlowResponse> {
    const response = await fetch(`${this.apiBaseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flowRequest)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  // 메시지 수정
  async updateEntry(entryId: string, content: string): Promise<JournalEntry> {
    const response = await fetch(`${this.apiBaseUrl}/messages/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  // 메시지 삭제
  async deleteEntry(entryId: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/messages/${entryId}`, { 
      method: 'DELETE' 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  // 메시지 내용 가져오기 (요약용)
  async getMessagesContent(userId: string, limit: number = 100, offset: number = 0): Promise<{ contents: string }> {
    const response = await fetch(`${this.apiBaseUrl}/messages/content?user_id=${userId}&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 히스토리 확인
  async checkHistory(userId: string): Promise<{ exists: boolean; record_date?: string; id?: string }> {
    const response = await fetch(`${this.apiBaseUrl}/summary/check/${userId}`);
    
    if (!response.ok) {
      throw new Error(`히스토리 확인 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 히스토리 저장
  async saveHistory(historyData: any, isOverwrite: boolean = false, existingHistoryId?: string): Promise<any> {
    let response;
    
    if (isOverwrite && existingHistoryId) {
      // 덮어쓰기: PUT 요청으로 기존 히스토리 업데이트
      response = await fetch(`${this.apiBaseUrl}/history/${existingHistoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyData)
      });
    } else {
      // 새로 저장: POST 요청
      response = await fetch(`${this.apiBaseUrl}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyData)
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // S3 키 확인
  async checkS3Key(historyId: string): Promise<{ s3_key: string | null }> {
    const response = await fetch(`${this.apiBaseUrl}/history/${historyId}/check-s3`);
    
    if (!response.ok) {
      throw new Error(`check-s3 API 호출 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 날짜로 S3 키 확인
  async checkS3KeyByDate(userId: string, recordDate: string): Promise<{ found: boolean; s3_key?: string; history_id?: string }> {
    const response = await fetch(`${this.apiBaseUrl}/history/check-s3-by-date?user_id=${userId}&record_date=${recordDate}`);
    
    if (!response.ok) {
      throw new Error(`check-s3-by-date API 호출 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 오늘 날짜 메시지 필터링
  filterTodayMessages(messages: JournalEntry[]): JournalEntry[] {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log('오늘 날짜 (로컬):', todayStr);
    
    return messages.filter((msg: JournalEntry) => {
      const msgDate = new Date(msg.created_at);
      const msgDateStr = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}-${String(msgDate.getDate()).padStart(2, '0')}`;
      
      console.log('메시지 날짜 (로컬):', msgDateStr, '원본:', msg.created_at, '내용:', msg.content.substring(0, 20));
      
      return msgDateStr === todayStr;
    });
  }

  // === History 관련 메서드 추가 ===

  // 전체 히스토리 조회
  async getAllHistory(userId: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const response = await fetch(`${this.apiBaseUrl}/history?user_id=${userId}&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`히스토리 조회 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 특정 히스토리 조회
  async getHistoryById(historyId: string): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/history/${historyId}`);
    
    if (!response.ok) {
      throw new Error(`히스토리 조회 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 히스토리 삭제
  async deleteHistory(historyId: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/history/${historyId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`히스토리 삭제 실패: ${response.status}`);
    }
  }

  // 날짜 범위로 히스토리 조회
  async getHistoryByDateRange(userId: string, startDate: string, endDate: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const response = await fetch(`${this.apiBaseUrl}/history/date-range?user_id=${userId}&start_date=${startDate}&end_date=${endDate}&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`날짜 범위 조회 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 히스토리 검색
  async searchHistory(userId: string, query: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const response = await fetch(`${this.apiBaseUrl}/history/search?user_id=${userId}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`검색 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 태그로 히스토리 검색
  async searchHistoryByTags(userId: string, tags: string[], matchAll: boolean = false, limit: number = 100, offset: number = 0): Promise<any[]> {
    const tagsParam = tags.join(',');
    const response = await fetch(`${this.apiBaseUrl}/history/tags?user_id=${userId}&tags=${encodeURIComponent(tagsParam)}&match_all=${matchAll}&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`태그 검색 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // 모든 태그 가져오기
  async getAllHistoryTags(userId: string): Promise<string[]> {
    const response = await fetch(`${this.apiBaseUrl}/history/tags/list?user_id=${userId}`);
    
    if (!response.ok) {
      throw new Error(`태그 조회 실패: ${response.status}`);
    }
    
    const data = await response.json();
    return data.tags || [];
  }

  // 히스토리 통계
  async getHistoryStats(userId: string, period: string = 'month'): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/history/stats?user_id=${userId}&period=${period}`);
    
    if (!response.ok) {
      throw new Error(`통계 조회 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // S3 키 업데이트 (이미지 URL 저장)
  async updateHistoryS3Key(historyId: string, s3Key: string): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/history/${historyId}/s3-key?s3_key=${encodeURIComponent(s3Key)}`, {
      method: 'PATCH',
    });
    
    if (!response.ok) {
      throw new Error(`S3 키 업데이트 실패: ${response.status}`);
    }
    
    return await response.json();
  }

  // S3 키로 파일 URL 가져오기 (Library API 사용)
  async getFileUrlFromS3Key(s3Key: string): Promise<string | null> {
    try {
      // Cognito 토큰 가져오기
      const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
      let token = null;
      
      if (clientId) {
        const cognitoKeys = Object.keys(localStorage).filter(key => 
          key.includes('CognitoIdentityServiceProvider') && 
          key.includes(clientId) &&
          key.endsWith('.idToken')
        );
        token = cognitoKeys.length > 0 ? localStorage.getItem(cognitoKeys[0]) : null;
      }
      
      // Library API URL 가져오기
      const libraryApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_LIBRARY_API_PREFIX || "/library"}`;
      const response = await fetch(`${libraryApiUrl}/library-items/url-by-key?s3_key=${encodeURIComponent(s3Key)}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
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
}
