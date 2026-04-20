// 리포트 API 서비스
const API_BASE_URL = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_REPORT_API_PREFIX || "/report"}`;

// 리포트 생성 요청 타입
interface CreateReportRequest {
  user_id?: string;
  start_date?: string;
  end_date?: string;
  diary_contents?: string; // 일기 내용 추가
}

// 리포트 응답 타입
export interface DailyAnalysis {
  date: string;
  score: number;
  sentiment: string;
  diary_content: string;
  key_themes: string[];
}

export interface Pattern {
  type: string;
  value: string;
  correlation: string;
  frequency: number;
  average_score: number;
}

// 리포트 응답 타입
export interface ReportResponse {
  id?: number; // 목록 조회 시 사용
  report_id?: number; // 생성 시 사용
  user_id: string;
  nickname: string;
  week_start?: string; // 목록 조회 시 사용
  week_end?: string; // 목록 조회 시 사용
  week_period?: { // 생성 시 사용
    start: string;
    end: string;
  };
  average_score: number;
  evaluation: string;
  daily_analysis: DailyAnalysis[];
  patterns: Pattern[];
  feedback: string[];
  has_partial_data?: boolean;
  created_at: string;
  s3_key: string;
}

// 리포트 목록 응답 타입
export interface ReportListResponse {
  reports: ReportResponse[];
  total: number;
}

class ReportApiService {
  private getAuthHeaders(): HeadersInit {
    // 백엔드가 토큰 인증을 사용하지 않으므로 기본 헤더만 반환
    return {
      "Content-Type": "application/json",
    };
  }

  // 지난 주 월요일~일요일 계산
  private getLastWeekRange(): { start_date: string; end_date: string } {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0(일) ~ 6(토)
    
    // 이번 주 월요일 계산
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 dayOfWeek - 1
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysFromMonday);
    
    // 지난 주 월요일 (이번 주 월요일에서 7일 전)
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    
    // 지난 주 일요일 (지난 주 월요일에서 6일 후)
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const result = {
      start_date: formatDate(lastMonday),
      end_date: formatDate(lastSunday)
    };
    
    console.log('📅 지난 주 계산:', {
      today: formatDate(today),
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek],
      lastMonday: result.start_date,
      lastSunday: result.end_date
    });
    
    return result;
  }

  // Journal API에서 일기 내용 가져오기
  private async fetchDiaryContents(userId: string, startDate: string, endDate: string): Promise<string> {
    try {
      const journalApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_JOURNAL_API_PREFIX || "/journal"}`;
      
      console.log('📖 일기 내용 조회 중...', { userId, startDate, endDate });
      
      // Journal API의 날짜 범위 조회 엔드포인트 사용
      const url = `${journalApiUrl}/history/date-range?user_id=${userId}&start_date=${startDate}&end_date=${endDate}&limit=100`;
      console.log('🔗 Journal API URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('⚠️ 일기 조회 실패:', response.status);
        return '';
      }
      
      const histories = await response.json();
      console.log('📚 조회된 일기 개수:', histories.length);
      
      if (!Array.isArray(histories) || histories.length === 0) {
        console.warn('⚠️ 해당 기간에 일기가 없습니다.');
        return '';
      }
      
      // 일기 내용을 하나의 문자열로 합치기
      const diaryContents = histories
        .map((history: any) => {
          const date = history.record_date || '';
          const content = history.content || '';
          return `[${date}]\n${content}`;
        })
        .join('\n\n');
      
      console.log('✅ 일기 내용 합치기 완료:', diaryContents.substring(0, 100) + '...');
      
      return diaryContents;
    } catch (error) {
      console.error('❌ 일기 조회 오류:', error);
      return '';
    }
  }

  // 리포트 생성
  async createReport(request?: CreateReportRequest): Promise<ReportResponse> {
    try {
      // 사용자 ID 가져오기
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        throw new Error('사용자 ID를 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      // 날짜 범위 결정 (제공되지 않으면 지난 주 자동 계산)
      const dateRange = request?.start_date && request?.end_date 
        ? { start_date: request.start_date, end_date: request.end_date }
        : this.getLastWeekRange();
      
      console.log('📊 리포트 생성 시작:', { userId, ...dateRange });
      
      // Journal API에서 일기 내용 가져오기
      const diaryContents = await this.fetchDiaryContents(
        userId, 
        dateRange.start_date, 
        dateRange.end_date
      );
      
      if (!diaryContents) {
        throw new Error('해당 기간에 일기가 없습니다. 일기를 작성한 후 다시 시도해주세요.');
      }
      
      // 요청 바디 구성
      const requestBody: any = {
        user_id: userId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        diary_contents: diaryContents,
      };
      
      console.log('📊 리포트 생성 요청:', {
        user_id: requestBody.user_id,
        start_date: requestBody.start_date,
        end_date: requestBody.end_date,
        diary_contents_length: diaryContents.length,
      });
      console.log('🔗 API URL:', `${API_BASE_URL}/create`);
      
      const response = await fetch(`${API_BASE_URL}/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('📡 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 에러 응답:', errorText);
        
        let errorMessage = '리포트 생성 실패';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.detail || error.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ 리포트 생성 성공:', result);
      
      return result;
    } catch (error) {
      console.error('❌ 리포트 생성 오류:', error);
      throw error;
    }
  }

  // 리포트 목록 조회
  async getReports(page: number = 1, limit: number = 10): Promise<ReportResponse[]> {
    try {
      // 사용자 ID 가져오기
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        console.warn('⚠️ 사용자 ID를 찾을 수 없습니다.');
        return [];
      }

      console.log('📋 리포트 목록 조회 요청:', { userId, limit });
      
      // API 엔드포인트: /?user_id=xxx&limit=10
      const url = `${API_BASE_URL}/?user_id=${userId}&limit=${limit}`;
      console.log('🔗 API URL:', url);
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      console.log('📡 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 에러 응답:', errorText);
        
        // 404는 리포트가 없는 정상 상황
        if (response.status === 404) {
          console.log('ℹ️ 아직 생성된 리포트가 없습니다.');
          return [];
        }
        
        throw new Error('리포트 목록 조회 실패');
      }

      const result: ReportListResponse = await response.json();
      console.log('✅ 리포트 목록 조회 성공:', result);
      
      return result.reports || [];
    } catch (error) {
      console.error('❌ 리포트 목록 조회 오류:', error);
      throw error;
    }
  }

  // 특정 리포트 조회
  async getReportById(reportId: number): Promise<ReportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/${reportId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('리포트 조회 실패');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('리포트 조회 오류:', error);
      throw error;
    }
  }
}

export const reportApiService = new ReportApiService();
