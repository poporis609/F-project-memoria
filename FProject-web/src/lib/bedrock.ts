// API 기반 요약 서비스
export interface JournalEntry {
  id: string;
  content: string;
  created_at: Date;
}

export interface SummaryResult {
  summary: string;
  message_count?: number;
}

export async function summarizeJournalEntries(userId: string, apiBaseUrl: string, date?: string, temperature: number = 0.5): Promise<SummaryResult> {
  try {
    console.log('API 요약 시작 - 사용자:', userId, 'temperature:', temperature);
    
    // 날짜가 제공되지 않으면 오늘 날짜 사용
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // FastAPI 백엔드의 요약 엔드포인트 호출 (날짜 및 temperature 파라미터 추가)
    console.log('백엔드 요약 API 호출 중... 날짜:', targetDate, 'temperature:', temperature);
    const response = await fetch(`${apiBaseUrl}/summary/${userId}?date=${targetDate}&temperature=${temperature}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 호출 실패: ${response.status} - ${errorData.detail || response.statusText}`);
    }
    
    const summaryData = await response.json();
    
    console.log('요약 생성 완료:', summaryData.summary.length, '자');
    console.log('처리된 메시지 수:', summaryData.message_count);

    return {
      summary: summaryData.summary,
      message_count: summaryData.message_count
    };

  } catch (error) {
    console.error('API 요약 실패:', error);
    
    // 구체적인 에러 정보 로깅
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
    }
    
    // 에러를 다시 throw하여 UI에서 처리할 수 있도록 함
    throw new Error(`AI 요약 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}