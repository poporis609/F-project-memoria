import { useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ReportResponse } from '@/services/reportApi';

interface WeeklyAnalysisFilmProps {
  reports: ReportResponse[];
  onCreateReport?: () => void;
  isCreatingReport?: boolean;
}

const WeeklyAnalysisFilm = ({ reports, onCreateReport, isCreatingReport = false }: WeeklyAnalysisFilmProps) => {
  const [width, setWidth] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  const motionDivRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // ReportResponse를 archiveData 형식으로 변환
  const archiveData = reports.map(report => ({
    nickname: report.nickname || "사용자",
    week_start: report.week_start || report.week_period?.start || '',
    week_end: report.week_end || report.week_period?.end || '',
    average_score: report.average_score,
    evaluation: report.evaluation,
    daily_analysis: (report.daily_analysis || []).map(day => ({
      date: day.date,
      score: day.score,
      sentiment: day.sentiment,
      key_themes: day.key_themes || [],
      diary_content: day.diary_content
    })),
    patterns: (report.patterns || []).map(p => `${p.value} (${p.type}, ${p.frequency}회)`),
    feedback: report.feedback || []
  }));

  // 전체 슬라이드 트랙의 너비를 계산하여 드래그 범위를 제한합니다.
  useEffect(() => {
    const updateWidth = () => {
      if (carousel.current) {
        const scrollWidth = carousel.current.scrollWidth;
        const offsetWidth = carousel.current.offsetWidth;
        setWidth(scrollWidth - offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    // 약간의 지연을 두고 다시 계산 (렌더링 완료 후)
    const timer = setTimeout(updateWidth, 100);

    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, []);

  // 특정 페이지로 이동하는 함수
  const goToPage = (index: number) => {
    setCurrentIndex(index);
    if (motionDivRef.current) {
      // 실제 렌더링된 첫 번째 article 요소의 너비를 가져옴
      const firstArticle = motionDivRef.current.querySelector('article');
      if (firstArticle) {
        const articleWidth = firstArticle.getBoundingClientRect().width;
        const gap = 64; // gap-16 = 64px
        const targetX = -(index * (articleWidth + gap));
        
        // framer-motion의 animate API 사용
        controls.start({ x: targetX, transition: { type: 'spring', stiffness: 300, damping: 30 } });
      }
    }
  };

  // 드래그 종료 시 현재 페이지 인덱스 업데이트
  const handleDragEnd = () => {
    if (motionDivRef.current) {
      const transform = window.getComputedStyle(motionDivRef.current).transform;
      const matrix = new DOMMatrix(transform);
      const currentX = matrix.m41;
      
      // 실제 렌더링된 첫 번째 article 요소의 너비를 가져옴
      const firstArticle = motionDivRef.current.querySelector('article');
      if (firstArticle) {
        const articleWidth = firstArticle.getBoundingClientRect().width;
        const gap = 64; // gap-16 = 64px
        
        // 현재 위치를 기반으로 가장 가까운 페이지 인덱스 계산
        const index = Math.round(-currentX / (articleWidth + gap));
        const clampedIndex = Math.max(0, Math.min(index, archiveData.length - 1));
        setCurrentIndex(clampedIndex);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b09] text-[#d4bba3] flex items-center justify-center overflow-hidden font-serif relative">
      {/* 배경 이미지 */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/library-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />

      {/* 노이즈 효과 레이어 */}
      <div className="film-grain"></div>

      {/* 영사기 빛 효과 (비네팅) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_black_90%)] z-10 pointer-events-none opacity-40"></div>

      {/* 캐러셀 컨테이너 */}
      <motion.div 
        ref={carousel} 
        className="cursor-grab active:cursor-grabbing overflow-hidden w-full h-screen z-20"
      >
        <motion.div 
          ref={motionDivRef}
          drag="x" 
          dragConstraints={{ right: 0, left: width > 0 ? -width : 0 }}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
          whileTap={{ cursor: "grabbing" }}
          onDragEnd={handleDragEnd}
          animate={controls}
          className="flex gap-16 px-20 h-full items-center"
        >
          {archiveData.length === 0 ? (
            <motion.article className="flex-none w-[90vw] md:w-[70vw] lg:w-[50vw] h-[85vh] select-none">
              <div className="relative bg-[#2a2520] border-x-[25px] border-[#050403] shadow-[0_0_80px_rgba(0,0,0,1)] h-full flex flex-col">
                {/* 상단 필름 구멍 */}
                <div className="h-14 bg-[#050403] flex justify-around items-center px-4 flex-shrink-0">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-5 bg-amber-200/10 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.2)] border border-white/10"
                    ></div>
                  ))}
                </div>

                {/* 빈 상태 콘텐츠 */}
                <div className="flex-1 flex items-center justify-center p-12 bg-gradient-to-b from-amber-100/10 via-transparent to-black/10">
                  <div className="text-center space-y-6">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-amber-200 text-xl font-medium">
                      일기를 꾸준히 작성하여 나만의 리포트를 받아보세요!
                    </p>
                    {onCreateReport && (
                      <button
                        onClick={onCreateReport}
                        disabled={isCreatingReport}
                        className="mt-6 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingReport ? '리포트 생성 중...' : '리포트 생성'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 하단 필름 구멍 */}
                <div className="h-14 bg-[#050403] flex justify-around items-center px-4 flex-shrink-0">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-5 bg-amber-200/10 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.2)] border border-white/10"
                    ></div>
                  ))}
                </div>
              </div>
            </motion.article>
          ) : archiveData.map((data, index) => (
            <motion.article 
              key={`${data.nickname}-${data.week_start}`}
              className="flex-none w-[90vw] md:w-[70vw] lg:w-[50vw] h-[85vh] select-none"
            >
              {/* 필름 프레임 본체 */}
              <div className="relative bg-[#2a2520] border-x-[25px] border-[#050403] shadow-[0_0_80px_rgba(0,0,0,1)] h-full flex flex-col">
                {/* 상단 필름 구멍 - 영사기 빔 느낌을 위해 광원 추가 */}
                <div className="h-14 bg-[#050403] flex justify-around items-center px-4 flex-shrink-0">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-5 bg-amber-200/10 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.2)] border border-white/10"
                    ></div>
                  ))}
                </div>

                {/* 콘텐츠 영역 */}
                <div className="p-12 flex-1 flex flex-col relative bg-gradient-to-b from-amber-100/10 via-transparent to-black/10 overflow-hidden">
                  {/* 아주 미세한 떨림 애니메이션 추가 (실제 영사기 느낌) */}
                  <motion.div 
                    animate={{ y: [0, -1, 1, 0] }}
                    transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 5 }}
                    className="relative z-10 h-full flex flex-col"
                  >
                    <header className="border-b border-amber-600/40 pb-6 mb-8 flex-shrink-0">
                      <p className="font-mono text-[11px] text-amber-400/80 tracking-[0.4em] mb-2 uppercase">
                        Archive Access: WEEK-{index + 1}
                      </p>
                      <h2 className="text-3xl font-bold text-amber-50 italic leading-tight">
                        {data.nickname}의 한 주
                      </h2>
                      <p className="text-sm text-amber-300 font-mono mt-3 italic">
                        {data.week_start} — {data.week_end}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <span className="text-xs px-2 py-1 bg-amber-900/40 border border-amber-600/40 rounded text-amber-200">
                          평균 점수: {data.average_score}/10
                        </span>
                        <span className={`text-xs px-2 py-1 border rounded ${
                          data.evaluation === 'positive' ? 'bg-green-900/40 border-green-600/40 text-green-200' :
                          data.evaluation === 'negative' ? 'bg-red-900/40 border-red-600/40 text-red-200' :
                          'bg-amber-900/40 border-amber-600/40 text-amber-200'
                        }`}>
                          {data.evaluation === 'positive' ? '긍정적' : data.evaluation === 'negative' ? '부정적' : '중립적'}
                        </span>
                      </div>
                    </header>

                    {/* 스크롤 가능한 콘텐츠 영역 */}
                    <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                      {/* 일별 분석 */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-amber-100 border-b border-amber-600/30 pb-2">
                          📅 일별 기록
                        </h3>
                        {data.daily_analysis.map((day, idx) => (
                          <div key={idx} className="bg-black/30 p-4 rounded border border-amber-600/30">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-mono text-amber-300">{day.date}</span>
                              <span className="text-xs px-2 py-1 bg-amber-800/50 rounded text-amber-100">
                                {day.score}/10
                              </span>
                            </div>
                            <p className="text-sm text-amber-200 mb-2 italic">감정: {day.sentiment}</p>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {day.key_themes.map((theme, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-700/40 rounded text-amber-100">
                                  #{theme}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-amber-50 leading-relaxed">
                              {day.diary_content}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* 패턴 분석 */}
                      {data.patterns && data.patterns.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-amber-100 border-b border-amber-600/30 pb-2">
                            🔍 발견된 패턴
                          </h3>
                          {data.patterns.map((pattern, idx) => (
                            <p key={idx} className="text-sm text-amber-50 pl-4 border-l-2 border-amber-600/40">
                              • {pattern}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* 피드백 */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-amber-100 border-b border-amber-600/30 pb-2">
                          💬 AI 피드백
                        </h3>
                        {data.feedback.map((fb, idx) => (
                          <p key={idx} className="text-sm text-amber-50 leading-relaxed">
                            {fb}
                          </p>
                        ))}
                      </div>
                    </section>
                  </motion.div>

                  <footer className="relative z-10 mt-4 flex-shrink-0">
                    <p className="text-right font-mono text-[9px] text-amber-400/60 tracking-tighter">
                      CLASSIFIED: WEEKLY_ANALYSIS_V1 • {data.daily_analysis.length} DAYS RECORDED
                    </p>
                  </footer>
                </div>

                {/* 하단 필름 구멍 */}
                <div className="h-14 bg-[#050403] flex justify-around items-center px-4 flex-shrink-0">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-5 bg-amber-200/10 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.2)] border border-white/10"
                    ></div>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>

      {/* 좌우 하이라이트 (렌즈 플레이어 효과) */}
      <div className="fixed top-0 left-0 w-64 h-full bg-gradient-to-r from-black to-transparent z-30 pointer-events-none opacity-80"></div>
      <div className="fixed top-0 right-0 w-64 h-full bg-gradient-to-l from-black to-transparent z-30 pointer-events-none opacity-80"></div>

      {/* 페이지 네비게이션 버튼 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full border border-amber-600/30">
        {archiveData.map((_, index) => (
          <button
            key={index}
            onClick={() => goToPage(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentIndex === index 
                ? 'bg-amber-500 w-8' 
                : 'bg-amber-800/50 hover:bg-amber-600/70'
            }`}
            title={`페이지 ${index + 1}로 이동`}
          />
        ))}
      </div>
    </div>
  );
};

export default WeeklyAnalysisFilm;
