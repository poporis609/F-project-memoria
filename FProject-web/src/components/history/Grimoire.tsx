import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Page } from './Page';
import { HistoryEventUI, KOREAN_UI_TEXTS } from '@/types/history';
import { ChevronLeft, ChevronRight, Loader2, BookOpen, X, Sparkles, ImagePlus, Trash2, RefreshCw, Wand2, FolderOpen } from 'lucide-react';
import { JournalApiService } from '@/components/journal/services/journalApi';
import { imageGeneratorApi } from '@/services/imageGeneratorApi';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.JOURNAL_API_PREFIX || "/journal"}`;
const journalApi = new JournalApiService(API_BASE_URL);

// AI 이미지 생성 팝업 상태 타입
interface ImageGenerationState {
  show: boolean;
  historyId: string | number;
  title: string;
  description: string;
  userId: string;
  recordDate: string;
  status: 'generating' | 'completed' | 'error' | 'saving';
  imageBase64?: string;
  imageUrl?: string;
  s3Key?: string;
  errorMessage?: string;
}

// 이미지 확대 팝업 상태 타입
interface ImagePreviewState {
  show: boolean;
  imageUrl: string;
  title: string;
}

// 이미지 변경 옵션 팝업 상태 타입
interface ImageChangeState {
  show: boolean;
  historyId: string | number;
  title: string;
  description: string;
  userId: string;
  recordDate: string;
  currentImageUrl?: string;
}

// 이미지 삭제 확인 팝업 상태 타입
interface ImageDeleteState {
  show: boolean;
  historyId: string | number;
  title: string;
}

interface GrimoireProps {
  content: HistoryEventUI[];
  isLoading: boolean;
  onFlip?: (e: any) => void;
  flipTrigger?: number;
  onDataChange?: () => void;
  bookSubtitle?: string;
}

export const Grimoire: React.FC<GrimoireProps> = ({ content, isLoading, onFlip, flipTrigger = 0, onDataChange, bookSubtitle }) => {
  const bookRef = useRef<any>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isBookReady, setIsBookReady] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; itemId: string | number; title: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [imageGeneration, setImageGeneration] = useState<ImageGenerationState | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
  const [imageChange, setImageChange] = useState<ImageChangeState | null>(null);
  const [imageDelete, setImageDelete] = useState<ImageDeleteState | null>(null);

  // 반응형 크기 계산
  const bookDimensions = useMemo(() => {
    const isMobile = windowSize.width < 768;
    const maxWidth = Math.min(windowSize.width * 0.95, 1200);
    const maxHeight = Math.min(windowSize.height * 0.85, 800);
    
    return {
      width: isMobile ? maxWidth : Math.min(450, maxWidth / 2),
      height: isMobile ? maxHeight : Math.min(650, maxHeight),
      isMobile
    };
  }, [windowSize]);

  // 윈도우 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 책 준비 상태 관리
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBookReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Chrome용 네이티브 휠 이벤트 리스너
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      
      // 스크롤 가능한 텍스트 영역인지 확인
      if (target.classList.contains('text-content-scrollable') || 
          target.closest('.text-content-scrollable')) {
        
        const scrollContainer = target.classList.contains('text-content-scrollable') 
          ? target 
          : target.closest('.text-content-scrollable') as HTMLElement;
        
        if (scrollContainer) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
          const isScrollable = scrollHeight > clientHeight;
          
          if (isScrollable) {
            // 스크롤 위치 직접 변경
            scrollContainer.scrollTop += e.deltaY;
            
            const newScrollTop = scrollContainer.scrollTop;
            const isAtTop = newScrollTop === 0;
            const isAtBottom = newScrollTop + clientHeight >= scrollHeight - 1;
            
            // 스크롤 범위 내에서만 이벤트 중단
            if (!((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom))) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }
      }
    };

    // 캡처 단계에서 이벤트 가로채기 (Chrome에서 작동)
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, []);

  // 네비게이션 함수들
  const next = useCallback(() => {
    if (bookRef.current?.pageFlip) {
      try {
        bookRef.current.pageFlip().flipNext();
      } catch (error) {
        console.warn('Next page navigation failed:', error);
      }
    }
  }, []);

  const prev = useCallback(() => {
    if (bookRef.current?.pageFlip) {
      try {
        bookRef.current.pageFlip().flipPrev();
      } catch (error) {
        console.warn('Previous page navigation failed:', error);
      }
    }
  }, []);

  const flipTo = useCallback((pageIndex: number) => {
    if (bookRef.current?.pageFlip && isBookReady) {
      try {
        bookRef.current.pageFlip().flip(pageIndex);
      } catch (error) {
        console.warn("Could not flip to page", pageIndex, error);
      }
    }
  }, [isBookReady]);

  // 자동 페이지 이동 효과
  useEffect(() => {
    if (flipTrigger > 0 && content.length > 0 && isBookReady) {
      const lastItemIndex = content.length - 1;
      const targetPage = 3 + (lastItemIndex * 2);

      const timer = setTimeout(() => {
        flipTo(targetPage);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [flipTrigger, content.length, isBookReady, flipTo]);

  // 안전한 onFlip 핸들러
  const handleFlip = useCallback((e: any) => {
    try {
      setCurrentPage(e.data);
      onFlip?.(e);
    } catch (error) {
      console.warn('Flip handler error:', error);
    }
  }, [onFlip]);

  // 현재 페이지에 해당하는 콘텐츠 아이템 찾기
  const getCurrentItem = useCallback(() => {
    // 페이지 3부터 콘텐츠 시작 (0: 표지, 1-2: 목차)
    if (currentPage < 3) return null;
    const itemIndex = Math.floor((currentPage - 3) / 2);
    return content[itemIndex] || null;
  }, [currentPage, content]);

  // 개별 히스토리 삭제 핸들러
  const handleDeleteItem = useCallback(async (itemId: string | number) => {
    try {
      // journalApi의 deleteHistory 사용
      await journalApi.deleteHistory(itemId.toString());
      setDeleteConfirm(null);
      onDataChange?.();
    } catch (error) {
      console.error('히스토리 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  }, [onDataChange]);

  const showDeleteConfirm = useCallback((itemId: string | number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirm({ show: true, itemId, title });
  }, []);

  // AI 이미지 생성 시작 (S3 저장 없이 base64로만 받기)
  const handleGenerateImage = useCallback(async (historyId: string | number, title: string, description: string, userId: string, recordDate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setImageGeneration({
      show: true,
      historyId,
      title,
      description,
      userId,
      recordDate,
      status: 'generating',
    });

    try {
      // 미리보기 API 사용 (S3 저장 안 함)
      const response = await imageGeneratorApi.previewImageForHistory(historyId, description);
      
      if (response.success && response.data) {
        setImageGeneration(prev => prev ? {
          ...prev,
          status: 'completed',
          imageBase64: response.data.imageBase64,
        } : null);
      } else {
        throw new Error(response.error || '이미지 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 이미지 생성 오류:', error);
      setImageGeneration(prev => prev ? {
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.',
      } : null);
    }
  }, []);

  // 생성된 이미지를 히스토리에 추가 (이때 S3 + DB 저장)
  const handleAddImageToHistory = useCallback(async () => {
    if (!imageGeneration?.imageBase64 || !imageGeneration?.historyId) return;

    setImageGeneration(prev => prev ? { ...prev, status: 'saving' } : null);

    try {
      // confirm API로 S3에 저장하고 DB 업데이트
      const response = await imageGeneratorApi.confirmImageForHistory(
        imageGeneration.historyId, 
        imageGeneration.imageBase64,
        imageGeneration.userId,
        imageGeneration.recordDate
      );
      
      if (response.success) {
        setImageGeneration(null);
        setImageChange(null);  // 이미지 변경 팝업도 닫기
        onDataChange?.();
      } else {
        throw new Error(response.error || '이미지 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 저장 오류:', error);
      setImageGeneration(prev => prev ? {
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '이미지 저장 중 오류가 발생했습니다.',
      } : null);
    }
  }, [imageGeneration, onDataChange]);

  // 이미지 확대 미리보기
  const handleImagePreview = useCallback((imageUrl: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setImagePreview({ show: true, imageUrl, title });
  }, []);

  // 이미지 변경 옵션 팝업 열기
  const handleImageChangeOpen = useCallback((historyId: string | number, title: string, description: string, userId: string, recordDate: string, e: React.MouseEvent, currentImageUrl?: string) => {
    e.stopPropagation();
    e.preventDefault();
    setImageChange({ show: true, historyId, title, description, userId, recordDate, currentImageUrl });
  }, []);

  // 이미지 삭제 확인 팝업 열기
  const handleImageDeleteOpen = useCallback((historyId: string | number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setImageDelete({ show: true, historyId, title });
  }, []);

  // 이미지 삭제 실행
  const handleImageDelete = useCallback(async () => {
    if (!imageDelete?.historyId) return;

    try {
      // s3_key를 null로 업데이트하여 이미지 삭제
      await journalApi.updateHistoryS3Key(imageDelete.historyId.toString(), '');
      setImageDelete(null);
      onDataChange?.();
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      alert('이미지 삭제 중 오류가 발생했습니다.');
    }
  }, [imageDelete, onDataChange]);

  // AI 이미지 생성 (이미지 변경용)
  const handleAIGenerateFromChange = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!imageChange) return;
    
    setImageChange(null);
    // 기존 이미지 생성 로직 호출
    handleGenerateImage(imageChange.historyId, imageChange.title, imageChange.description, imageChange.userId, imageChange.recordDate, e);
  }, [imageChange, handleGenerateImage]);

  // 전체 페이지 배열을 하나의 useMemo로 통합
  const allPages = useMemo(() => {
    const pages = [];

    // 표지
    pages.push(
      <Page key="page-0" number={0}>
        <div className="flex flex-col items-center justify-center h-full text-center p-8 relative">
          {/* 장식 테두리 */}
          <div className="absolute inset-6 border-[3px] border-double border-amber-950/30 rounded-sm"></div>
          <div className="absolute inset-8 border border-amber-950/20"></div>

          <div className="relative z-10">
            <BookOpen className="w-20 h-20 text-amber-950 mb-8 opacity-70 animate-pulse" strokeWidth={1.5} />
            <h1 className="text-6xl md:text-7xl font-title text-amber-950 mb-8 tracking-tighter font-bold drop-shadow-lg">
              {KOREAN_UI_TEXTS.bookTitle}
            </h1>
            <div className="w-32 h-[3px] bg-gradient-to-r from-transparent via-amber-900/60 to-transparent mb-8 mx-auto"></div>
            <p className="font-antique text-2xl text-amber-900 font-bold uppercase tracking-[0.3em] mb-12">
              {bookSubtitle || KOREAN_UI_TEXTS.bookSubtitle}
            </p>

            {/* 클릭 유도 텍스트 */}
            <div className="mt-16 animate-bounce">
              <p className="font-antique text-sm text-amber-800/70 mb-2">
                책을 클릭하여 읽기
              </p>
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-800/50 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-amber-800/50 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-amber-800/50 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>

            <div className="mt-12 text-amber-900/40 text-xs font-title tracking-[0.3em]">
              HISTORY
            </div>
          </div>
        </div>
      </Page>
    );

    // 목차 - 왼쪽 페이지
    pages.push(
      <Page key="page-1" number={1}>
        <div className="flex flex-col items-center justify-center h-full p-4 border-2 border-amber-900/10 m-2 overflow-hidden">
          <h2 className="font-title text-3xl text-amber-950 mb-4 border-b-2 border-amber-900/20 pb-2 flex-shrink-0">
            {KOREAN_UI_TEXTS.index}
          </h2>
          <div className="text-center font-antique text-amber-900/80 space-y-4 w-full flex flex-col items-center flex-1 overflow-hidden">

            {isLoading && (
               <div className="flex flex-col items-center animate-pulse pt-8">
                 <Loader2 className="w-10 h-10 text-amber-800 animate-spin mb-4" />
                 <p className="font-handwriting text-xl text-amber-800">{KOREAN_UI_TEXTS.loading}</p>
               </div>
            )}

            {content.length > 0 && (
              <div className="w-full flex-1 flex flex-col mt-2 overflow-hidden">
                <div className="flex-1 w-full overflow-hidden">
                  <ul className="text-left text-sm space-y-3">
                    {content.slice(0, 10).map((c, i) => {
                      const targetPage = 4 + (i * 2);

                      return (
                        <li
                          key={`toc-${i}`}
                          data-page={targetPage}
                          data-index={i}
                          data-title={c.parsed.title}
                          className="flex justify-between border-b border-amber-900/10 pb-1 items-end cursor-pointer hover:bg-amber-900/5 transition-colors p-1 select-none"
                          onClickCapture={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const target = e.currentTarget as HTMLElement;
                            const page = parseInt(target.getAttribute('data-page') || '0');
                            const title = target.getAttribute('data-title') || '';
                            console.log(`목차 클릭: ${title}, 페이지 ${page}로 이동`);
                            flipTo(page);
                          }}
                          onMouseDownCapture={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <span className="truncate mr-2 font-antique text-amber-950 pointer-events-none">{c.parsed.title}</span>
                          <span className="text-xs text-amber-900/60 whitespace-nowrap pointer-events-none">
                            {KOREAN_UI_TEXTS.page} {targetPage}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </Page>
    );

    // 목차 - 오른쪽 페이지 (10개 이상일 때)
    pages.push(
      <Page key="page-2" number={2}>
        <div className="flex flex-col items-center justify-center h-full p-4 border-2 border-amber-900/10 m-2 overflow-hidden">
          {content.length > 10 ? (
            <>
              <h2 className="font-title text-3xl text-amber-950 mb-4 border-b-2 border-amber-900/20 pb-2 flex-shrink-0">
                {KOREAN_UI_TEXTS.index} (계속)
              </h2>
              <div className="text-center font-antique text-amber-900/80 space-y-4 w-full flex flex-col items-center flex-1 overflow-hidden">
                <div className="w-full flex-1 flex flex-col mt-2 overflow-hidden">
                  <div className="flex-1 w-full overflow-hidden">
                    <ul className="text-left text-sm space-y-3">
                      {content.slice(10, 20).map((c, i) => {
                        const actualIndex = i + 10;
                        const targetPage = 4 + (actualIndex * 2);

                        return (
                          <li
                            key={`toc-${actualIndex}`}
                            data-page={targetPage}
                            data-index={actualIndex}
                            data-title={c.parsed.title}
                            className="flex justify-between border-b border-amber-900/10 pb-1 items-end cursor-pointer hover:bg-amber-900/5 transition-colors p-1 select-none"
                            onClickCapture={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const target = e.currentTarget as HTMLElement;
                              const page = parseInt(target.getAttribute('data-page') || '0');
                              const title = target.getAttribute('data-title') || '';
                              console.log(`목차 클릭: ${title}, 페이지 ${page}로 이동`);
                              flipTo(page);
                            }}
                            onMouseDownCapture={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <span className="truncate mr-2 font-antique text-amber-950 pointer-events-none">{c.parsed.title}</span>
                            <span className="text-xs text-amber-900/60 whitespace-nowrap pointer-events-none">
                              {KOREAN_UI_TEXTS.page} {targetPage}
                            </span>
                          </li>
                        );
                      })}
                      {content.length > 20 && (
                        <li className="text-center text-xs text-amber-900/40 italic pt-2">
                          ... 외 {content.length - 20}개 항목
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center opacity-20">
              <div className="w-32 h-32 border-4 border-amber-900/30 rounded-full flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-amber-900/20 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </Page>
    );

    // 콘텐츠 페이지들
    content.forEach((item, index) => {
      const leftPageNum = 3 + (index * 2);
      const rightPageNum = 4 + (index * 2);

      // 이미지 URL - parsed.image_url 사용 (historyDB에서 s3_key를 여기에 매핑함)
      const imageUrl = item.parsed.image_url;
      const hasImage = !!imageUrl;
      
      console.log('이미지 URL:', imageUrl, 'item:', item);

      // 왼쪽 페이지 - 날짜, 연도, 이미지
      pages.push(
        <Page key={`page-${leftPageNum}`} number={leftPageNum}>
          <div 
            className="h-full flex flex-col relative"
          >
            {/* 날짜 헤더 - 중앙 유지 */}
            <div className="flex items-center justify-center mb-2">
              <div className="h-[1px] w-6 bg-amber-900/40"></div>
              <span className="mx-3 font-serif text-amber-900 font-bold tracking-wide text-sm">
                {item.parsed.year}
              </span>
              <div className="h-[1px] w-6 bg-amber-900/40"></div>
            </div>

            <h2
              className="font-serif text-xl md:text-2xl text-amber-950 font-bold leading-tight text-center mb-3"
              style={{
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
                whiteSpace: 'nowrap'
              }}
            >
              {item.parsed.title}
            </h2>

            {/* 이미지 영역 - 남는 공간 모두 사용 */}
            <div className="relative flex-1 flex items-center justify-center">
              <div className="relative w-full h-full bg-amber-900/5 border-2 border-amber-900/20 rounded-sm overflow-hidden group/image">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-900/40 pointer-events-none z-10"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-900/40 pointer-events-none z-10"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-900/40 pointer-events-none z-10"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-900/40 pointer-events-none z-10"></div>

                {hasImage ? (
                  <>
                    {/* 이미지 클릭 시 확대 */}
                    <img
                      src={imageUrl}
                      alt={item.parsed.title}
                      className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
                      style={{ filter: 'sepia(0.2) contrast(0.9)' }}
                      onClickCapture={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleImagePreview(imageUrl!, item.parsed.title, e);
                      }}
                      onMouseDownCapture={(e) => e.stopPropagation()}
                      onError={(e) => {
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                    {/* 이미지 액션 버튼들 (오른쪽 위) */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity z-20">
                      {/* 이미지 변경 버튼 */}
                      <button
                        onClickCapture={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleImageChangeOpen(item.id, item.parsed.title, item.parsed.description, item.user_id, item.record_date, e, imageUrl);
                        }}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full bg-amber-900/80 hover:bg-amber-800 text-amber-100 transition-colors shadow-lg"
                        title="이미지 변경"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {/* 이미지 삭제 버튼 */}
                      <button
                        onClickCapture={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleImageDeleteOpen(item.id, item.parsed.title, e);
                        }}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full bg-red-900/80 hover:bg-red-800 text-red-100 transition-colors shadow-lg"
                        title="이미지 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/50">
                    <button
                      onClickCapture={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('AI 이미지 생성 버튼 클릭:', item.id, item.parsed.title);
                        handleGenerateImage(item.id, item.parsed.title, item.parsed.description, item.user_id, item.record_date, e);
                      }}
                      onMouseDownCapture={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex flex-col items-center gap-3 p-6 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 border-2 border-amber-700/30 hover:border-amber-700/50 transition-all group cursor-pointer z-50"
                    >
                      <div className="p-3 rounded-full bg-amber-700/10 group-hover:bg-amber-700/20 transition-colors">
                        <Sparkles className="w-8 h-8 text-amber-700" />
                      </div>
                      <span className="font-serif text-amber-900 font-bold text-sm">
                        AI로 이미지 생성
                      </span>
                      <span className="font-serif text-amber-700/70 text-xs">
                        클릭하여 이미지 만들기
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Page>
      );

      // 오른쪽 페이지 - 요약(description)만
      pages.push(
        <Page key={`page-${rightPageNum}`} number={rightPageNum}>
           <div className="h-full flex flex-col relative">
              {/* 장식 테두리가 있는 텍스트 영역 */}
              <div 
                className="relative flex-1 bg-amber-900/5 border-2 border-amber-900/20 rounded-sm overflow-hidden"
                onClickCapture={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseDownCapture={(e) => {
                  e.stopPropagation();
                }}
              >
                {/* 모서리 장식 */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-900/40 z-10 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-900/40 z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-900/40 z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-900/40 z-10 pointer-events-none"></div>

                {/* 텍스트 내용 */}
                <div
                  className="text-content-scrollable font-serif text-lg text-amber-950 leading-relaxed h-full p-4"
                  data-scroll-container="true"
                  style={{
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#8b5a2b #f4e4bc',
                    cursor: 'text',
                    overflowY: 'scroll',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y'
                  }}
                >
                  {item.parsed.description}
                </div>
              </div>
           </div>
        </Page>
      );
    });

    // 마지막 페이지들
    const endPageNumber = content.length > 0 ? 3 + (content.length * 2) : 3;

    pages.push(
      <Page key={`page-${endPageNumber}`} number={endPageNumber}>
         <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <p className="font-title text-xl mb-4">{KOREAN_UI_TEXTS.end}</p>
            <div className="w-8 h-8 rounded-full border border-amber-900 flex items-center justify-center">
              <div className="w-1 h-1 bg-amber-900 rounded-full"></div>
            </div>
         </div>
      </Page>
    );

    pages.push(
      <Page key={`page-${endPageNumber + 1}`} number={endPageNumber + 1}>
         <div className="h-full bg-amber-900/5"></div>
      </Page>
    );

    return pages;
  }, [content, isLoading, flipTo]);

  if (!isBookReady) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-12 h-12 text-amber-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex justify-center items-center py-4 perspective-1000">
      {/* 삭제 확인 팝업 */}
      {deleteConfirm?.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="relative bg-amber-50 border-4 border-amber-900/40 rounded-lg shadow-2xl max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(to bottom, #f9f3e3 0%, #f4e4bc 50%, #ead6a4 100%)',
            }}
          >
            {/* 장식 테두리 */}
            <div className="absolute inset-3 border-2 border-double border-amber-900/20 rounded pointer-events-none"></div>
            
            {/* 종이 텍스처 */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
              }}
            ></div>

            <div className="relative z-10 p-8">
              {/* 제목 */}
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-red-900/10 rounded-full mb-4">
                  <X className="w-8 h-8 text-red-900" />
                </div>
                <h3 className="font-serif text-2xl text-amber-950 font-bold mb-2">
                  기록 삭제
                </h3>
                <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-900/40 to-transparent mx-auto"></div>
              </div>

              {/* 내용 */}
              <div className="text-center mb-8">
                <p className="font-serif text-amber-950 mb-3 leading-relaxed">
                  다음 기록을 삭제하시겠습니까?
                </p>
                <p className="font-serif text-lg text-amber-900 font-bold bg-amber-900/10 py-2 px-4 rounded border border-amber-900/20">
                  "{deleteConfirm.title}"
                </p>
                <p className="font-serif text-sm text-red-900/70 mt-3">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 font-serif rounded border-2 border-amber-900/30 transition-all hover:scale-105"
                >
                  취소
                </button>
                <button
                  onClick={() => handleDeleteItem(deleteConfirm.itemId)}
                  className="flex-1 px-6 py-3 bg-red-900 hover:bg-red-800 text-amber-50 font-serif font-bold rounded border-2 border-red-950 transition-all hover:scale-105 shadow-lg"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 이미지 생성 팝업 */}
      {imageGeneration?.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => imageGeneration.status !== 'generating' && setImageGeneration(null)}
        >
          <div 
            className="relative bg-amber-50 border-4 border-amber-900/40 rounded-lg shadow-2xl max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(to bottom, #f9f3e3 0%, #f4e4bc 50%, #ead6a4 100%)',
              minWidth: '360px',
            }}
          >
            {/* 장식 테두리 */}
            <div className="absolute inset-3 border-2 border-double border-amber-900/20 rounded pointer-events-none"></div>
            
            {/* 종이 텍스처 */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
              }}
            ></div>

            <div className="relative z-10 p-8">
              {/* 제목 */}
              <div className="text-center mb-6">
                <div className={`inline-block p-3 rounded-full mb-4 ${
                  imageGeneration.status === 'generating' || imageGeneration.status === 'saving' ? 'bg-amber-700/10' :
                  imageGeneration.status === 'completed' ? 'bg-green-700/10' : 'bg-red-900/10'
                }`}>
                  {imageGeneration.status === 'generating' || imageGeneration.status === 'saving' ? (
                    <Sparkles className="w-8 h-8 text-amber-700 animate-pulse" />
                  ) : imageGeneration.status === 'completed' ? (
                    <ImagePlus className="w-8 h-8 text-green-700" />
                  ) : (
                    <X className="w-8 h-8 text-red-900" />
                  )}
                </div>
                <h3 className="font-serif text-2xl text-amber-950 font-bold mb-2">
                  {imageGeneration.status === 'generating' ? 'AI로 이미지 생성중' :
                   imageGeneration.status === 'saving' ? '히스토리에 저장중' :
                   imageGeneration.status === 'completed' ? '이미지 생성 완료' : '이미지 생성 실패'}
                </h3>
                <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-900/40 to-transparent mx-auto"></div>
              </div>

              {/* 내용 */}
              <div className="text-center mb-6">
                <p className="font-serif text-sm text-amber-700 mb-3">
                  "{imageGeneration.title}"
                </p>

                {imageGeneration.status === 'generating' && (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-amber-700 animate-spin" />
                    <p className="font-serif text-amber-900 text-sm">
                      AI가 일기 내용을 분석하여 이미지를 생성하고 있습니다...
                    </p>
                    <p className="font-serif text-amber-700/70 text-xs">
                      약 10-30초 정도 소요됩니다
                    </p>
                  </div>
                )}

                {imageGeneration.status === 'completed' && imageGeneration.imageBase64 && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-full max-w-[280px] aspect-square rounded-lg overflow-hidden border-2 border-amber-900/30 shadow-lg">
                      <img
                        src={`data:image/png;base64,${imageGeneration.imageBase64}`}
                        alt="생성된 이미지"
                        className="w-full h-full object-cover"
                        style={{ filter: 'sepia(0.1) contrast(0.95)' }}
                      />
                    </div>
                    <p className="font-serif text-green-800 text-sm">
                      이미지가 성공적으로 생성되었습니다!
                    </p>
                  </div>
                )}

                {imageGeneration.status === 'saving' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-full max-w-[280px] aspect-square rounded-lg overflow-hidden border-2 border-amber-900/30 shadow-lg opacity-70">
                      <img
                        src={`data:image/png;base64,${imageGeneration.imageBase64}`}
                        alt="저장 중인 이미지"
                        className="w-full h-full object-cover"
                        style={{ filter: 'sepia(0.1) contrast(0.95)' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                      </div>
                    </div>
                    <p className="font-serif text-amber-800 text-sm">
                      히스토리에 저장하는 중...
                    </p>
                  </div>
                )}

                {imageGeneration.status === 'error' && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="font-serif text-red-900 text-sm">
                      {imageGeneration.errorMessage || '이미지 생성 중 오류가 발생했습니다.'}
                    </p>
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                {imageGeneration.status === 'generating' ? (
                  <button
                    disabled
                    className="flex-1 px-6 py-3 bg-amber-900/20 text-amber-700 font-serif rounded border-2 border-amber-900/30 cursor-not-allowed"
                  >
                    생성 중...
                  </button>
                ) : imageGeneration.status === 'saving' ? (
                  <button
                    disabled
                    className="flex-1 px-6 py-3 bg-amber-900/20 text-amber-700 font-serif rounded border-2 border-amber-900/30 cursor-not-allowed"
                  >
                    저장 중...
                  </button>
                ) : imageGeneration.status === 'completed' ? (
                  <>
                    <button
                      onClick={() => setImageGeneration(null)}
                      className="flex-1 px-6 py-3 bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 font-serif rounded border-2 border-amber-900/30 transition-all hover:scale-105"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddImageToHistory}
                      className="flex-1 px-6 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-serif font-bold rounded border-2 border-amber-800 transition-all hover:scale-105 shadow-lg"
                    >
                      히스토리에 추가
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setImageGeneration(null)}
                    className="flex-1 px-6 py-3 bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 font-serif rounded border-2 border-amber-900/30 transition-all hover:scale-105"
                  >
                    닫기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 미리보기 팝업 */}
      {imagePreview?.show && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setImagePreview(null)}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagePreview.imageUrl}
              alt={imagePreview.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={() => setImagePreview(null)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImagePreview(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-lg text-white font-serif text-sm">
              {imagePreview.title}
            </p>
          </div>
        </div>
      )}

      {/* 이미지 변경 옵션 팝업 */}
      {imageChange?.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setImageChange(null)}
        >
          <div 
            className="relative bg-amber-50 border-4 border-amber-900/40 rounded-lg shadow-2xl max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(to bottom, #f9f3e3 0%, #f4e4bc 50%, #ead6a4 100%)',
            }}
          >
            {/* 장식 테두리 */}
            <div className="absolute inset-3 border-2 border-double border-amber-900/20 rounded pointer-events-none"></div>
            
            {/* 종이 텍스처 */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
              }}
            ></div>

            <div className="relative z-10 p-8">
              {/* 제목 */}
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-amber-700/10 rounded-full mb-4">
                  <RefreshCw className="w-8 h-8 text-amber-700" />
                </div>
                <h3 className="font-serif text-2xl text-amber-950 font-bold mb-2">
                  이미지 변경
                </h3>
                <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-900/40 to-transparent mx-auto"></div>
              </div>

              {/* 내용 */}
              <div className="text-center mb-6">
                <p className="font-serif text-amber-900 mb-4">
                  "{imageChange.title}"의 이미지를 변경합니다.
                </p>
                <p className="font-serif text-sm text-amber-700/70">
                  원하는 방법을 선택하세요.
                </p>
              </div>

              {/* 버튼들 */}
              <div className="space-y-3">
                <button
                  onClick={handleAIGenerateFromChange}
                  className="w-full px-6 py-4 bg-amber-700 hover:bg-amber-600 text-amber-50 font-serif font-bold rounded-lg border-2 border-amber-800 transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
                >
                  <Wand2 className="w-5 h-5" />
                  AI 자동 생성
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: 라이브러리에서 선택 기능 구현
                    alert('라이브러리에서 선택 기능은 추후 구현 예정입니다.');
                  }}
                  className="w-full px-6 py-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-serif rounded-lg border-2 border-amber-700/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <FolderOpen className="w-5 h-5" />
                  라이브러리에서 선택
                </button>
                <button
                  onClick={() => setImageChange(null)}
                  className="w-full px-6 py-3 bg-transparent hover:bg-amber-900/10 text-amber-700 font-serif rounded-lg transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 삭제 확인 팝업 */}
      {imageDelete?.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setImageDelete(null)}
        >
          <div 
            className="relative bg-amber-50 border-4 border-amber-900/40 rounded-lg shadow-2xl max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(to bottom, #f9f3e3 0%, #f4e4bc 50%, #ead6a4 100%)',
            }}
          >
            {/* 장식 테두리 */}
            <div className="absolute inset-3 border-2 border-double border-amber-900/20 rounded pointer-events-none"></div>
            
            {/* 종이 텍스처 */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
              }}
            ></div>

            <div className="relative z-10 p-8">
              {/* 제목 */}
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-red-900/10 rounded-full mb-4">
                  <Trash2 className="w-8 h-8 text-red-900" />
                </div>
                <h3 className="font-serif text-2xl text-amber-950 font-bold mb-2">
                  이미지 삭제
                </h3>
                <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-900/40 to-transparent mx-auto"></div>
              </div>

              {/* 내용 */}
              <div className="text-center mb-8">
                <p className="font-serif text-amber-950 mb-3 leading-relaxed">
                  다음 기록의 이미지를 삭제하시겠습니까?
                </p>
                <p className="font-serif text-lg text-amber-900 font-bold bg-amber-900/10 py-2 px-4 rounded border border-amber-900/20">
                  "{imageDelete.title}"
                </p>
                <p className="font-serif text-sm text-red-900/70 mt-3">
                  이미지만 삭제되며, 기록 내용은 유지됩니다.
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setImageDelete(null)}
                  className="flex-1 px-6 py-3 bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 font-serif rounded border-2 border-amber-900/30 transition-all hover:scale-105"
                >
                  취소
                </button>
                <button
                  onClick={handleImageDelete}
                  className="flex-1 px-6 py-3 bg-red-900 hover:bg-red-800 text-amber-50 font-serif font-bold rounded border-2 border-red-950 transition-all hover:scale-105 shadow-lg"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 스크롤바 스타일 */}
      <style>{`
        .text-content-scrollable::-webkit-scrollbar {
          width: 6px;
        }
        .text-content-scrollable::-webkit-scrollbar-track {
          background: rgba(139, 90, 43, 0.1);
          border-radius: 3px;
        }
        .text-content-scrollable::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8b5a2b, #6b4423);
          border-radius: 3px;
          border: 1px solid rgba(244, 228, 188, 0.3);
        }
        .text-content-scrollable::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #6b4423, #4b2e1a);
        }
      `}</style>

      {/* 책 표지 가죽 효과 - 모바일 모서리 */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-[20px] overflow-hidden"
        style={{
          width: bookDimensions.isMobile ? bookDimensions.width + 20 : (bookDimensions.width * 2) + 40,
          height: bookDimensions.height + 30,
          background: 'linear-gradient(135deg, #3e2723 0%, #2a1a15 50%, #1a0f0a 100%)',
          boxShadow: `
            0 30px 60px -15px rgba(0, 0, 0, 0.8),
            0 0 0 3px #5d4037,
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.5)
          `
        }}
      >
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/black-leather.png')]"></div>
      </div>

      {/* 페이지 레이어들 - 왼쪽 (자연스럽게 */}
      {!bookDimensions.isMobile && (
        <>
          {/* 레이어 5 - 가장 바깥 (가장 어둡고 흐릿하게 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-l-[16px]"
            style={{
              width: '5px',
              height: bookDimensions.height + 22,
              marginLeft: -(bookDimensions.width + 27),
              background: 'linear-gradient(to bottom, rgba(107, 86, 56, 0.95) 0%, rgba(87, 66, 46, 0.95) 50%, rgba(67, 46, 36, 0.95) 100%)',
              boxShadow: '2px 0 4px rgba(0,0,0,0.4), inset -1px 0 2px rgba(0,0,0,0.3)',
              filter: 'blur(0.3px)'
            }}
          />
          {/* 레이어 4 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-l-[14px]"
            style={{
              width: '4px',
              height: bookDimensions.height + 19,
              marginLeft: -(bookDimensions.width + 22),
              background: 'linear-gradient(to bottom, rgba(139, 111, 71, 0.9) 0%, rgba(119, 91, 61, 0.9) 50%, rgba(99, 71, 51, 0.9) 100%)',
              boxShadow: '2px 0 3px rgba(0,0,0,0.3), inset -1px 0 1px rgba(0,0,0,0.2)',
              filter: 'blur(0.2px)'
            }}
          />
          {/* 레이어 3 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-l-[12px]"
            style={{
              width: '3px',
              height: bookDimensions.height + 16,
              marginLeft: -(bookDimensions.width + 18),
              background: 'linear-gradient(to bottom, rgba(171, 143, 103, 0.85) 0%, rgba(151, 123, 93, 0.85) 50%, rgba(131, 103, 83, 0.85) 100%)',
              boxShadow: '1px 0 2px rgba(0,0,0,0.25), inset -1px 0 1px rgba(0,0,0,0.15)'
            }}
          />
          {/* 레이어 2 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-l-[10px]"
            style={{
              width: '2px',
              height: bookDimensions.height + 14,
              marginLeft: -(bookDimensions.width + 15),
              background: 'linear-gradient(to bottom, rgba(203, 175, 135, 0.8) 0%, rgba(183, 155, 125, 0.8) 50%, rgba(163, 135, 115, 0.8) 100%)',
              boxShadow: '1px 0 2px rgba(0,0,0,0.2)'
            }}
          />
          {/* 레이어 1 - 가장 안쪽 (가장 밝게) */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-l-[8px]"
            style={{
              width: '2px',
              height: bookDimensions.height + 12,
              marginLeft: -(bookDimensions.width + 12),
              background: 'linear-gradient(to bottom, rgba(235, 207, 167, 0.7) 0%, rgba(215, 187, 157, 0.7) 50%, rgba(195, 167, 147, 0.7) 100%)',
              boxShadow: '1px 0 1px rgba(0,0,0,0.1)'
            }}
          />
        </>
      )}

      {/* 페이지 레이어들 - 오른쪽(자연스럽게 */}
      {!bookDimensions.isMobile && (
        <>
          {/* 레이어 5 - 가장 바깥 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-r-[16px]"
            style={{
              width: '5px',
              height: bookDimensions.height + 22,
              marginLeft: bookDimensions.width + 22,
              background: 'linear-gradient(to bottom, rgba(107, 86, 56, 0.95) 0%, rgba(87, 66, 46, 0.95) 50%, rgba(67, 46, 36, 0.95) 100%)',
              boxShadow: '-2px 0 4px rgba(0,0,0,0.4), inset 1px 0 2px rgba(0,0,0,0.3)',
              filter: 'blur(0.3px)'
            }}
          />
          {/* 레이어 4 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-r-[14px]"
            style={{
              width: '4px',
              height: bookDimensions.height + 19,
              marginLeft: bookDimensions.width + 18,
              background: 'linear-gradient(to bottom, rgba(139, 111, 71, 0.9) 0%, rgba(119, 91, 61, 0.9) 50%, rgba(99, 71, 51, 0.9) 100%)',
              boxShadow: '-2px 0 3px rgba(0,0,0,0.3), inset 1px 0 1px rgba(0,0,0,0.2)',
              filter: 'blur(0.2px)'
            }}
          />
          {/* 레이어 3 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-r-[12px]"
            style={{
              width: '3px',
              height: bookDimensions.height + 16,
              marginLeft: bookDimensions.width + 15,
              background: 'linear-gradient(to bottom, rgba(171, 143, 103, 0.85) 0%, rgba(151, 123, 93, 0.85) 50%, rgba(131, 103, 83, 0.85) 100%)',
              boxShadow: '-1px 0 2px rgba(0,0,0,0.25), inset 1px 0 1px rgba(0,0,0,0.15)'
            }}
          />
          {/* 레이어 2 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-r-[10px]"
            style={{
              width: '2px',
              height: bookDimensions.height + 14,
              marginLeft: bookDimensions.width + 13,
              background: 'linear-gradient(to bottom, rgba(203, 175, 135, 0.8) 0%, rgba(183, 155, 125, 0.8) 50%, rgba(163, 135, 115, 0.8) 100%)',
              boxShadow: '-1px 0 2px rgba(0,0,0,0.2)'
            }}
          />
          {/* 레이어 1 - 가장 안쪽 */}
          <div
            className="absolute left-1/2 top-1/2 transform -translate-y-1/2 rounded-r-[8px]"
            style={{
              width: '2px',
              height: bookDimensions.height + 12,
              marginLeft: bookDimensions.width + 11,
              background: 'linear-gradient(to bottom, rgba(235, 207, 167, 0.7) 0%, rgba(215, 187, 157, 0.7) 50%, rgba(195, 167, 147, 0.7) 100%)',
              boxShadow: '-1px 0 1px rgba(0,0,0,0.1)'
            }}
          />
        </>
      )}

      {/* 중앙 바인딩 효과 - 자연스러운 제본선 */}
      {!bookDimensions.isMobile && (
        <div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          style={{
            width: '4px',
            height: bookDimensions.height + 40,
            background: `
              linear-gradient(to right,
                rgba(62, 39, 35, 0.3) 0%,
                rgba(42, 26, 21, 0.5) 50%,
                rgba(62, 39, 35, 0.3) 100%
              )
            `,
            boxShadow: `
              -2px 0 8px rgba(0,0,0,0.2),
              2px 0 8px rgba(0,0,0,0.2)
            `
          }}
        />
      )}

      {/* 책 컴포넌트 */}
      <div className="z-10 relative book-container" style={{
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))'
      }}>
        <style>{`
          .book-container .stf__wrapper {
            pointer-events: none;
          }
          .book-container .stf__wrapper > * {
            pointer-events: auto;
          }
          .text-content-scrollable {
            pointer-events: auto !important;
          }
          /* 삭제 버튼이 클릭 가능하도록 */
          [data-delete-btn] {
            pointer-events: auto !important;
            cursor: pointer !important;
          }
          [data-delete-btn] * {
            pointer-events: auto !important;
          }
        `}</style>
        <HTMLFlipBook
          width={bookDimensions.width}
          height={bookDimensions.height}
          size="fixed"
          minWidth={300}
          maxWidth={1000}
          minHeight={400}
          maxHeight={1533}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          ref={bookRef}
          className="book-pages"
          onFlip={handleFlip}
          usePortrait={bookDimensions.isMobile}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          useMouseEvents={true}
          swipeDistance={100}
          clickEventForward={false}
          style={{}}
          startZIndex={0}
          autoSize={false}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {allPages}
        </HTMLFlipBook>

        {/* 네비게이션 컨트롤 */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-4 md:px-0">
            <div className="pointer-events-auto">
              {content.length > 0 && (
                <button
                  onClick={prev}
                  className="text-amber-100/40 hover:text-amber-100 transition-all hover:scale-110 md:transform md:-translate-x-16"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft size={56} strokeWidth={1} />
                </button>
              )}
            </div>

            <div className="pointer-events-auto">
               {content.length > 0 && (
                <button
                  onClick={next}
                  className="text-amber-100/40 hover:text-amber-100 transition-all hover:scale-110 md:transform md:translate-x-16"
                  aria-label="다음 페이지"
                >
                  <ChevronRight size={56} strokeWidth={1} />
                </button>
               )}
            </div>
        </div>

        {/* 삭제 버튼 - 왼쪽 페이지의 오른쪽 상단 위치 (책 바깥 오버레이) */}
        {getCurrentItem() && !bookDimensions.isMobile && (
          <div 
            className="absolute z-30 pointer-events-auto"
            style={{
              top: '15px',
              left: `calc(50% - 15px)`,
              transform: 'translateX(-100%)'
            }}
          >
            <button
              onClick={() => {
                const item = getCurrentItem();
                if (item) {
                  setDeleteConfirm({ show: true, itemId: item.id, title: item.parsed.title });
                }
              }}
              className="p-1.5 rounded-full bg-red-900/20 hover:bg-red-900/40 transition-all hover:scale-110"
              aria-label="삭제"
            >
              <X className="w-4 h-4 text-red-900/70 hover:text-red-900" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
