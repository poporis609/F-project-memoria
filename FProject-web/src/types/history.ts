// 백엔드 API 응답 타입 (Journal API 기준)
// history 테이블의 실제 필드들
export interface HistoryEvent {
  id: number | string;  // Primary key
  user_id: string;
  content: string; // 전체 내용 (요약 + 상세 기록이 함께 포함됨)
  record_date: string; // YYYY-MM-DD 형식
  tags: string[];
  s3_key?: string | null; // S3에 저장된 이미지 키 (DB에 저장)
  file_url?: string | null; // 백엔드에서 s3_key로부터 생성한 전체 S3 URL
  text_url?: string | null; // S3에 저장된 텍스트 파일(.txt) 주소
  created_at?: string; // 생성 시간
  updated_at?: string; // 수정 시간
}

// 파싱된 콘텐츠 타입
export interface ParsedHistoryContent {
  title: string;
  year: string;
  description: string; // 요약 부분 (content에서 추출)
  details: string; // 상세 기록 부분 (content에서 추출)
  image_url?: string; // 이미지 URL (s3_key 또는 file_url에서)
}

// UI에서 사용하는 확장된 타입
export interface HistoryEventUI extends HistoryEvent {
  parsed: ParsedHistoryContent;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 페이지네이션 정보
export interface Pagination {
  current_page: number;
  total_pages: number;
  total_records: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// 기록 목록 응답
export interface RecordsResponse {
  records: HistoryEvent[];
  pagination: Pagination;
}

// 태그 카운트
export interface TagCount {
  tag: string;
  count: number;
}

// 날짜별 카운트
export interface DateCount {
  date: string;
  count: number;
}

// 통계 응답
export interface StatsResponse {
  period: string;
  total_records: number;
  records_in_period: number;
  most_used_tags: TagCount[];
  records_by_date: DateCount[];
  date_range: {
    start_date: string | null;
    end_date: string;
  };
}

export interface BookContent {
  leftPage: HistoryEvent | null;
  rightPage: HistoryEvent | null;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READING = 'READING',
  ERROR = 'ERROR'
}

export const KOREAN_UI_TEXTS = {
  searchPlaceholder: "기록 날짜 불러오기",
  loading: "기록 준비중..",
  reset: "초기화",
  index: "목차",
  page: "페이지",
  end: "끝",
  errorTitle: "기록을 불러올 수 없습니다",
  errorMessage: "역사를 불러오는 중 오류가 발생했습니다.",
  confirmReset: "정말로 모든 기록을 삭제하시겠습니까?",
  suggestedTopics: [], // DB에서 동적으로 로드됨
  bookTitle: "히스토리",
  bookSubtitle: "나의 기록",
  allTags: "전체",
  duplicateWarning: "이미 검색한 내역입니다"
};
