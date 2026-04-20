import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { Grimoire } from '@/components/history/Grimoire';
import { historyDB, clearLocalDB } from '@/services/historyDB';
import { HistoryEventUI, AppState, KOREAN_UI_TEXTS } from '@/types/history';
import { Search, Sparkles, Trash2, Tag, X } from 'lucide-react';
import ErrorBoundary from '@/components/history/ErrorBoundary';
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";

const History = () => {
  const [query, setQuery] = useState('');
  const [historyContent, setHistoryContent] = useState<HistoryEventUI[]>([]);
  const [filteredContent, setFilteredContent] = useState<HistoryEventUI[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [flipTrigger, setFlipTrigger] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');
  const [searchResults, setSearchResults] = useState<HistoryEventUI[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [recentViewed, setRecentViewed] = useState<string[]>([]); // 최근 본 기록 (날짜 형식)
  const [profileNickname, setProfileNickname] = useState<string>("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, isCognitoConfigured } = useAuth();
  const { displayName, userId, isLoading: userLoading } = useCurrentUser();

  // 표시할 닉네임 (API 우선, 로딩 중에는 "사용자")
  const userDisplayName = isLoadingProfile ? "사용자" : (profileNickname || displayName || "사용자");

  // 프로필 정보 로드
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        if (!clientId) {
          setIsLoadingProfile(false);
          return;
        }

        const cognitoKeys = Object.keys(localStorage).filter(key => 
          key.includes('CognitoIdentityServiceProvider') && 
          key.includes(clientId) &&
          key.endsWith('.idToken')
        );

        if (cognitoKeys.length === 0) {
          setIsLoadingProfile(false);
          return;
        }

        const token = localStorage.getItem(cognitoKeys[0]);
        if (!token) {
          setIsLoadingProfile(false);
          return;
        }

        const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
        const response = await fetch(`${authApiUrl}/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const profile = data.data;
          setProfileNickname(profile.nickname || profile.preferred_username || '');
        }
      } catch (error) {
        console.error('History - 프로필 로드 오류:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // 인증 확인 및 리다이렉트
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
  }, [isAuthenticated, authLoading, navigate]);

  // 컴포넌트 마운트 시 로컬 DB 정리 및 PostgreSQL에서 기록 로드
  useEffect(() => {
    // 인증되지 않은 경우 초기화하지 않음
    if (!isAuthenticated || authLoading || userLoading) {
      return;
    }

    const initializeApp = async () => {
      // 실제 사용자 ID 사용 (Cognito에서 가져온 사용자 정보)
      console.log('🔐 History 초기화 - 사용자 ID:', userId);
      
      localStorage.setItem('currentUserId', userId);

      // 로컬 IndexedDB 정리 (사용자별로 한 번만 실행)
      const hasCleanedLocal = localStorage.getItem(`hasCleanedLocalDB_${userId}`);
      if (!hasCleanedLocal) {
        await clearLocalDB();
        localStorage.setItem(`hasCleanedLocalDB_${userId}`, 'true');
      }

      // 최근 본 기록 불러오기 (사용자별)
      const savedRecent = localStorage.getItem(`recentViewed_${userId}`);
      if (savedRecent) {
        setRecentViewed(JSON.parse(savedRecent));
      }

      // PostgreSQL에서 데이터 로드
      await loadHistory();
    };

    initializeApp();
  }, [isAuthenticated, authLoading, userLoading, userId]);

  // 태그 필터링 - DB API 사용
  useEffect(() => {
    const filterByTag = async () => {
      if (selectedTag) {
        const filtered = await historyDB.filterByTag(selectedTag);
        setFilteredContent(filtered);
      } else {
        const allRecords = await historyDB.getAll();
        setFilteredContent(allRecords);
      }
    };

    if (historyContent.length > 0) {
      filterByTag();
    }
  }, [selectedTag, historyContent.length]);

  const loadHistory = async () => {
    console.log('📖 loadHistory 시작...');
    const history = await historyDB.getAll();
    const tags = await historyDB.getAllTags();

    console.log('📚 불러온 기록:', history.length, '개');
    console.log('🏷️ 불러온 태그:', tags);

    if (history.length > 0) {
      setHistoryContent(history);
      setFilteredContent(history);
      setAppState(AppState.READING);
      console.log('✅ 상태 업데이트 완료');
    } else {
      console.log('⚠️ 기록이 없습니다');
    }
    setAvailableTags(tags);
  };

  const handleSearch = async (e?: React.FormEvent | string) => {
    if (typeof e !== 'string' && e) e.preventDefault();

    const topic = typeof e === 'string' ? e : query;
    if (!topic.trim()) return;

    setAppState(AppState.LOADING);
    setErrorMessage('');
    setDuplicateWarning('');

    try {
      // 태그 중복 체크 (검색어가 태그로 이미 존재하는지)
      const isDuplicate = await historyDB.hasTag(topic.trim());

      // DB에서 검색 (키워드 검색 - 콘텐츠 내용 검색)
      const dbResults = await historyDB.search(topic.trim());

      if (dbResults.length > 0) {
        // 중복 제거: id와 content 기준으로 유니크한 결과만 필터링
        const uniqueResults = dbResults.filter((item, index, self) =>
          index === self.findIndex((t) => (
            t.id === item.id ||
            (t.parsed.title === item.parsed.title && t.parsed.year === item.parsed.year)
          ))
        );

        console.log(`🔍 검색 결과: ${dbResults.length}개 → 중복 제거 후 ${uniqueResults.length}개`);

        // DB에 관련 내용이 있으면 표시
        setSearchResults(uniqueResults);
        setShowSidebar(true);
        setAppState(AppState.IDLE);

        // 태그로도 존재하면 중복 경고
        if (isDuplicate) {
          setDuplicateWarning(topic.trim());
        }
        return;
      }

      // DB에 검색 결과가 없으면 에러 표시
      throw new Error(`"${topic}"에 대한 검색 결과가 없습니다. DB에 데이터를 먼저 추가해주세요.`);

    } catch (error) {
      console.error("Search failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "기록을 불러올 수 없습니다...");
      setAppState(AppState.ERROR);
      setShowSidebar(false);
    }
  };

  const handleSelectResult = async (selectedEvents: HistoryEventUI[]) => {
    try {
      // DB에 저장하지 않고 바로 표시 (임시 사용)
      setHistoryContent(selectedEvents);
      setFilteredContent(selectedEvents);
      setAppState(AppState.READING);
      setQuery('');
      setShowSidebar(false);
      setSearchResults([]);
      setDuplicateWarning('');
      setFlipTrigger((prev: number) => prev + 1);

      // 최근 본 기록에 추가 (사용자별로 저장)
      const newDates = selectedEvents.map(e => e.record_date);
      const updatedRecent = [...new Set([...newDates, ...recentViewed])].slice(0, 5);
      setRecentViewed(updatedRecent);
      localStorage.setItem(`recentViewed_${userId}`, JSON.stringify(updatedRecent));

    } catch (error) {
      console.error("Display failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "표시에 실패했습니다.");
    }
  };

  const clearHistory = async () => {
    if (window.confirm("정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      await historyDB.clear();
      setHistoryContent([]);
      setFilteredContent([]);
      setAvailableTags([]);
      setSelectedTag('');
      setAppState(AppState.IDLE);
      setFlipTrigger(0);
    }
  };

  const resetFilters = () => {
    setSelectedTag('');
    setQuery('');
    setFilteredContent(historyContent);
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };

  // 배경 스타일을 useMemo로 메모이제이션 (리렌더 시 재생성 방지)
  const backgroundStyle = useMemo(() => ({
    backgroundImage: 'url(/library-bg.png)',
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
    backgroundRepeat: 'no-repeat' as const,
    backgroundAttachment: 'fixed' as const
  }), []);

  // 로딩 상태 처리
  if (authLoading || userLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto mb-4"></div>
            <p className="font-serif text-amber-800">기억의 서를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 전까지의 fallback)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="h-screen bg-background relative overflow-hidden w-full">
        {/* 고정 배경 레이어 */}
        <div className="fixed inset-0 pointer-events-none" style={backgroundStyle}>
          {/* 다크 오버레이 */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* 콘텐츠 레이어 */}
        <div className="relative z-10 h-screen flex overflow-hidden">

      {showSidebar && (
        <div className="fixed left-0 top-0 h-screen w-80 bg-[#1a120b]/95 backdrop-blur-sm border-r border-amber-900/30 z-30 overflow-y-auto shadow-2xl">       
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-amber-100 font-serif text-xl flex items-center gap-2">
                <Search className="w-5 h-5" />
                검색 결과
              </h2>
              <button
                onClick={() => {
                  setShowSidebar(false);
                  setDuplicateWarning('');
                }}
                className="text-amber-700 hover:text-amber-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 text-amber-800/80 text-sm font-serif">
              "{query}" 검색 결과 {searchResults.length}개
            </div>

            {/* 중복 경고 메시지 (사이드바 내부) */}
            {duplicateWarning && (
              <div className="mb-4 bg-amber-900/20 border border-amber-700/50 text-amber-200 px-3 py-2 rounded text-xs font-serif">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <div>
                    <div className="font-bold mb-1">이미 추가된 검색어입니다</div>
                    <div className="text-amber-300/80">
                      "{duplicateWarning}"는 이미 책에 추가되어 있습니다.
                      그래도 추가하시려면 아래 버튼을 클릭하세요.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="bg-amber-900/10 border border-amber-900/30 rounded-lg p-4 hover:bg-amber-900/20 transition-all cursor-pointer group"
                  onClick={() => handleSelectResult([result])}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-amber-100 font-serif font-bold text-base group-hover:text-amber-50">
                      {result.parsed.title}
                    </h3>
                    <span className="text-amber-700 text-xs font-serif whitespace-nowrap ml-2">
                      {result.parsed.year}
                    </span>
                  </div>
                  <p className="text-amber-800/90 text-sm font-serif leading-relaxed">
                    {result.parsed.description}
                  </p>
                  <div className="mt-3 text-amber-700/60 text-xs font-serif group-hover:text-amber-600">
                    클릭하여 추가 →
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSelectResult(searchResults)}
              className="w-full mt-6 bg-amber-700 hover:bg-amber-600 text-amber-100 py-3 rounded-lg font-serif transition-colors shadow-lg"
            >
              전체 추가 ({searchResults.length}개)
            </button>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center overflow-hidden">

      {/* 상단 검색바 영역 */}
      <div className="w-full max-w-2xl px-4 py-2 mt-1 flex flex-col items-center gap-2 flex-shrink-0">
        {/* 중복 경고 메시지 (사이드바가 닫혔을 때만) */}
        {duplicateWarning && !showSidebar && (
          <div className="w-full bg-amber-900/20 border border-amber-700/50 text-amber-200 px-4 py-2 rounded-lg text-sm font-serif flex items-center justify-between animate-pulse">
            <span>"{duplicateWarning}" {KOREAN_UI_TEXTS.duplicateWarning}</span>
            <button onClick={() => setDuplicateWarning('')} className="hover:text-amber-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSearch}
          className="relative w-full group transition-all duration-300 focus-within:scale-105"
        >
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${userDisplayName}님의 ${KOREAN_UI_TEXTS.searchPlaceholder}`}
              disabled={appState === AppState.LOADING}
              className="w-full px-6 py-4 pr-14 text-lg rounded-full border-4 border-amber-700 bg-amber-50/95 text-amber-900 placeholder-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-500 disabled:opacity-50 shadow-2xl backdrop-blur-sm font-serif"
            />

            <button
              type="submit"
              disabled={appState === AppState.LOADING || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-amber-700 text-white rounded-full hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {appState === AppState.LOADING ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        {/* Cognito 설정 안내 */}
        {!isCognitoConfigured && (
          <div className="w-full px-2">
            <div className="bg-amber-900/20 border border-amber-700/50 text-amber-200 px-4 py-2 rounded-lg text-sm font-serif">
              💡 Cognito 설정이 완료되면 실제 사용자별 기록이 표시됩니다.
            </div>
          </div>
        )}

        <div className="flex w-full justify-between items-start px-2">
            <div className="flex flex-wrap gap-2 text-xs font-serif text-amber-800/60">
              {availableTags.length > 0 ? (
                // DB에서 가져온 태그들을 추천 검색어로 표시 (최대 5개)
                availableTags.slice(0, 5).map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => { setQuery(topic); handleSearch(topic); }}
                    className="hover:text-amber-500 transition-colors cursor-pointer border-b border-transparent hover:border-amber-500"
                  >
                    {topic}
                  </button>
                ))
              ) : (
                // DB에 태그가 없으면 기본 추천 검색어 표시
                KOREAN_UI_TEXTS.suggestedTopics.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => { setQuery(topic); handleSearch(topic); }}
                    className="hover:text-amber-500 transition-colors cursor-pointer border-b border-transparent hover:border-amber-500"
                  >
                    {topic}
                  </button>
                ))
              )}
            </div>

            {historyContent && historyContent.length > 0 && (
              <button
                onClick={resetFilters}
                className="text-amber-900/60 hover:text-amber-900 bg-amber-100/80 hover:bg-amber-200 px-2 py-1 rounded transition-colors text-xs flex items-center gap-1 font-serif"
                title="필터 초기화"
              >
                <X className="w-3 h-3" />
                <span>초기화</span>
              </button>
            )}
        </div>
      </div>

      {/* 메인 책 디스플레이 영역 */}
      <main className="flex-1 w-full flex items-center justify-center px-4 overflow-hidden">
        <ErrorBoundary>
          {appState === AppState.ERROR ? (
            <div className="text-center text-red-900 bg-[#f3e5ab] p-8 rounded shadow-lg font-serif border border-red-800 max-w-md mx-4">
              <h3 className="text-xl font-bold mb-2">{KOREAN_UI_TEXTS.errorTitle}</h3>
              <p>{KOREAN_UI_TEXTS.errorMessage}</p>
              <p className="text-sm mt-2 opacity-75 font-sans whitespace-pre-wrap">{errorMessage}</p>
              <button
                onClick={() => setAppState(AppState.IDLE)}
                className="mt-4 text-xs uppercase tracking-widest border-b border-red-900/30 hover:border-red-900 pb-1 transition-all"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <Grimoire
              content={filteredContent}
              isLoading={appState === AppState.LOADING}
              flipTrigger={flipTrigger}
              onDataChange={loadHistory}
              bookSubtitle={`${userDisplayName}의 기록`}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="w-full text-center py-1 text-amber-900/20 font-serif text-[9px] tracking-widest uppercase flex-shrink-0">
        M M X X V  ·  G R I M O I R E
      </footer>
      </div>
      </div>
      </div>
    </MainLayout>
  );
};

export default History;
