import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { reportApiService, ReportResponse } from "@/services/reportApi";
import WeeklyAnalysisFilm from "@/components/report/WeeklyAnalysisFilm";

const Report = () => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [weeklyReportData, setWeeklyReportData] = useState<ReportResponse[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { userId, isLoading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // userId를 localStorage에 저장
  useEffect(() => {
    if (userId && !userLoading) {
      console.log('🔐 Report 초기화 - 사용자 ID:', userId);
      localStorage.setItem('currentUserId', userId);
    }
  }, [userId, userLoading]);

  // 리포트 목록 불러오기
  useEffect(() => {
    const loadReports = async () => {
      if (!isAuthenticated || authLoading || userLoading || !userId) return;
      
      try {
        setIsLoadingReports(true);
        const reports = await reportApiService.getReports(1, 100);
        setWeeklyReportData(reports);
        console.log('📊 리포트 목록 로드 완료:', reports);
      } catch (error: any) {
        console.error('❌ 리포트 목록 로드 실패:', error);
        setWeeklyReportData([]);
        
        if (error.message && !error.message.includes('404') && !error.message.includes('조회 실패')) {
          console.warn('⚠️ 리포트 조회 중 예상치 못한 오류:', error.message);
        }
      } finally {
        setIsLoadingReports(false);
      }
    };

    loadReports();
  }, [isAuthenticated, authLoading, userLoading, userId]);

  // 리포트 생성 핸들러
  const handleCreateReport = async () => {
    setShowConfirmModal(false);
    setIsCreatingReport(true);

    try {
      const report = await reportApiService.createReport();
      console.log('✅ 리포트 생성 완료:', report);
      
      // 생성된 리포트를 목록에 추가
      setWeeklyReportData(prev => [report, ...prev]);
      
      alert('리포트가 성공적으로 생성되었습니다!');
    } catch (error: any) {
      console.error('❌ 리포트 생성 실패:', error);
      alert(error.message || '리포트 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCreatingReport(false);
    }
  };

  // 확인 모달 컴포넌트
  const ConfirmModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowConfirmModal(false)}
      />
      
      {/* 모달 콘텐츠 */}
      <div className="relative bg-gradient-to-b from-amber-50 to-amber-100 rounded-2xl shadow-2xl border-2 border-amber-300 p-6 max-w-md w-full">
        {/* 닫기 버튼 */}
        <button
          onClick={() => setShowConfirmModal(false)}
          className="absolute top-4 right-4 text-amber-600 hover:text-amber-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 아이콘 */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">📊</div>
          <h3 className="text-xl font-bold text-amber-900 mb-2">
            새로운 리포트를 생성할까요?
          </h3>
          <p className="text-sm text-amber-700">
            지난 주 월요일부터 일요일까지의 일기를 분석하여<br />
            리포트를 생성합니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowConfirmModal(false)}
            className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCreateReport}
            className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            예
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 확인 모달 */}
      {showConfirmModal && <ConfirmModal />}
      
      <MainLayout>
        {isLoadingReports ? (
          <div className="h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="font-serif text-muted-foreground">리포트를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <WeeklyAnalysisFilm 
            reports={weeklyReportData} 
            onCreateReport={() => setShowConfirmModal(true)}
            isCreatingReport={isCreatingReport}
          />
        )}
      </MainLayout>
    </>
  );
};

export default Report;
