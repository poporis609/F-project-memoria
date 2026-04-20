import { HistoryEvent, HistoryEventUI, ParsedHistoryContent } from '@/types/history';
import { JournalApiService } from '@/components/journal/services/journalApi';
import { apiService } from '@/services/api';

// API 기본 URL - Journal API와 동일한 URL 사용
const API_BASE_URL = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_JOURNAL_API_PREFIX || "/journal"}`;

// JournalApiService 인스턴스 생성
const journalApi = new JournalApiService(API_BASE_URL);

// 브라우저 로컬 DB 삭제 (IndexedDB 정리)
export async function clearLocalDB(): Promise<void> {
  try {
    // 레거시 IndexedDB 이름들 삭제
    const dbNames = ['historyDB', 'grimoireDB', 'history', 'grimoire'];

    for (const dbName of dbNames) {
      try {
        console.log('🗑️ 로컬 DB 삭제 시도:', dbName);
        indexedDB.deleteDatabase(dbName);
      } catch (err) {
        console.warn('⚠️ DB 삭제 실패:', dbName, err);
      }
    }

    // localStorage 정리
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('history') || key.includes('grimoire') || key.includes('DB'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log('🗑️ localStorage 삭제:', key);
      localStorage.removeItem(key);
    });

    console.log('✅ 로컬 DB 정리 완료');
  } catch (error) {
    console.warn('⚠️ 로컬 DB 정리 중 오류:', error);
  }
}



// content 필드 파싱 헬퍼 - Journal API 형식에 맞춤
async function parseHistoryContent(event: HistoryEvent): Promise<ParsedHistoryContent> {
  // 날짜를 제목용 형식으로 포맷
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '날짜 없음';
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}년 ${month}월 ${day}일`;
    } catch {
      return dateStr;
    }
  };

  // content에서 요약만 추출
  // Journal 형식: "[요약]\n{summary}\n\n[상세 기록]\n{details}"
  let description = '';

  if (event.content) {
    const summaryMatch = event.content.match(/\[요약\]\s*\n([\s\S]*?)(?:\n\n\[상세 기록\]|$)/);

    if (summaryMatch) {
      description = summaryMatch[1].trim();
    } else {
      // 형식이 맞지 않으면 전체를 description으로 사용
      description = event.content;
    }
  }

  // 백엔드에서 생성한 file_url 사용, 없으면 s3_key로 백엔드 API 호출
  let imageUrl: string | undefined = undefined;
  
  if (event.file_url) {
    // 백엔드가 잘못된 도메인으로 URL을 생성하는 경우 수정
    imageUrl = event.file_url.replace('https://library.aws11.shop/api/v1', `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_LIBRARY_API_PREFIX || "/library"}`);
  } else if (event.s3_key) {
    // Library API의 url-by-key 엔드포인트 사용
    const url = await apiService.getFileUrlFromS3Key(event.s3_key);
    imageUrl = url || undefined;
  }

  console.log('이미지 URL 파싱:', {
    s3_key: event.s3_key,
    file_url: event.file_url,
    imageUrl
  });

  return {
    title: formatDate(event.record_date),
    year: event.record_date ? new Date(event.record_date).getFullYear().toString() : '',
    description,
    details: '', // 상세 기록은 사용하지 않음
    image_url: imageUrl
  };
}

// HistoryEvent를 HistoryEventUI로 변환
async function toHistoryEventUI(event: HistoryEvent): Promise<HistoryEventUI> {
  return {
    ...event,
    parsed: await parseHistoryContent(event)
  };
}

export const historyDB = {
  // 전체 기록 조회 - JournalApiService 사용
  async getAll(page: number = 1, limit: number = 100): Promise<HistoryEventUI[]> {
    try {
      console.log('📚 getAll 호출됨', { page, limit });
      
      const offset = (page - 1) * limit;
      const userId = localStorage.getItem('currentUserId') || 'user_001';
      
      const data = await journalApi.getAllHistory(userId, limit, offset);
      
      console.log('📚 받은 데이터', data);
      const result = await Promise.all(data.map(toHistoryEventUI));
      console.log('📚 변환된 데이터', result);
      return result;
    } catch (error) {
      console.error('❌ 데이터 로딩 오류:', error);
      return [];
    }
  },

  // 특정 기록 조회
  async getById(id: number): Promise<HistoryEventUI | null> {
    try {
      const record = await journalApi.getHistoryById(id.toString());
      return await toHistoryEventUI(record);
    } catch (error) {
      console.error('기록 조회 오류:', error);
      return null;
    }
  },

  // 기록 추가 - JournalApiService의 saveHistory 사용
  async add(events: HistoryEventUI[]): Promise<void> {
    try {
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('저장할 데이터가 유효하지 않습니다.');
      }

      const userId = localStorage.getItem('currentUserId') || 'user_001';

      // 각 이벤트를 개별적으로 저장
      for (const event of events) {
        // Journal API 형식으로 content 생성
        const content = event.parsed.description && event.parsed.details
          ? `[요약]\n${event.parsed.description}\n\n[상세 기록]\n${event.parsed.details}`
          : event.content;

        await journalApi.saveHistory({
          user_id: userId,
          content: content,
          record_date: event.record_date,
          tags: event.tags,
          ...(event.s3_key && { s3_key: event.s3_key }),
          ...(event.text_url && { text_url: event.text_url }),
          ...(event.file_url && { file_url: event.file_url })
        });
      }
    } catch (error) {
      console.error('데이터 저장 오류:', error);
      throw new Error('기록을 저장하는 중 오류가 발생했습니다.');
    }
  },

  // 기록 삭제 (전체)
  async clear(): Promise<void> {
    try {
      // 모든 기록을 가져와 개별 삭제
      const records = await this.getAll(1, 1000);
      for (const record of records) {
        await journalApi.deleteHistory(record.id.toString());
      }
    } catch (error) {
      console.error('데이터 삭제 오류:', error);
      throw new Error('기록을 삭제하는 중 오류가 발생했습니다.');
    }
  },

  // 날짜 범위로 기록 조회
  async getByDateRange(startDate: string, endDate: string, page: number = 1, limit: number = 100): Promise<HistoryEventUI[]> {
    try {
      const userId = localStorage.getItem('currentUserId') || 'user_001';
      const offset = (page - 1) * limit;
      
      const data = await journalApi.getHistoryByDateRange(userId, startDate, endDate, limit, offset);
      return await Promise.all(data.map(toHistoryEventUI));
    } catch (error) {
      console.error('날짜 범위 조회 오류:', error);
      return [];
    }
  },

  // 키워드로 검색
  async search(query: string, page: number = 1, limit: number = 100): Promise<HistoryEventUI[]> {
    try {
      const userId = localStorage.getItem('currentUserId') || 'user_001';
      const offset = (page - 1) * limit;
      
      const data = await journalApi.searchHistory(userId, query, limit, offset);
      return await Promise.all(data.map(toHistoryEventUI));
    } catch (error) {
      console.error('검색 오류:', error);
      return [];
    }
  },

  // 태그로 검색
  async searchByTags(tags: string[], matchAll: boolean = false, page: number = 1, limit: number = 100): Promise<HistoryEventUI[]> {
    try {
      const userId = localStorage.getItem('currentUserId') || 'user_001';
      const offset = (page - 1) * limit;
      
      const data = await journalApi.searchHistoryByTags(userId, tags, matchAll, limit, offset);
      return await Promise.all(data.map(toHistoryEventUI));
    } catch (error) {
      console.error('태그 검색 오류:', error);
      return [];
    }
  },

  // 모든 태그 가져오기
  async getAllTags(): Promise<string[]> {
    try {
      const userId = localStorage.getItem('currentUserId') || 'user_001';
      return await journalApi.getAllHistoryTags(userId);
    } catch (error) {
      console.error('태그 조회 오류:', error);
      return [];
    }
  },

  // 태그로 필터링
  async filterByTag(tag: string): Promise<HistoryEventUI[]> {
    return this.searchByTags([tag], false);
  },

  // 통계 조회
  async getStats(period: string = 'month'): Promise<any | null> {
    try {
      const userId = localStorage.getItem('currentUserId') || 'user_001';
      return await journalApi.getHistoryStats(userId, period);
    } catch (error) {
      console.error('통계 조회 오류:', error);
      return null;
    }
  },

  // 태그 중복 체크
  async hasTag(tag: string): Promise<boolean> {
    const tags = await this.getAllTags();
    return tags.includes(tag);
  }
};

