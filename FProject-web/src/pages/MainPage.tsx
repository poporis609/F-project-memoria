import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

import LibraryBackground from "@/components/LibraryBackground";
import LandingOverlay from "@/components/LandingOverlay";
import IntroMessage from "@/components/IntroMessage";

type AppState = "loading" | "landing" | "intro" | "navigating";

const MainPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [appState, setAppState] = useState<AppState>("loading");
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // MainPage 렌더링 확인
  console.log('🎯 MainPage 렌더링됨!');
  console.log('현재 URL:', window.location.href);
  console.log('현재 pathname:', window.location.pathname);

  // 인증 상태 확인 후 초기 상태 설정
  useEffect(() => {
    console.log('🔍 MainPage - 인증 상태 체크:', { isLoading, isAuthenticated, authCheckComplete });
    
    // 인증 로딩이 완료되면 상태 결정
    if (!isLoading && !authCheckComplete) {
      console.log('✅ 인증 로딩 완료');
      setAuthCheckComplete(true);
      
      if (isAuthenticated) {
        // 이미 로그인된 사용자는 바로 일기 페이지로
        console.log('✅ 로그인됨 - /journal로 이동');
        navigate("/journal", { replace: true });
      } else {
        // 로그인되지 않은 사용자는 랜딩 화면 표시
        console.log('ℹ️ 로그인 안됨 - 랜딩 화면 표시');
        setAppState("landing");
      }
    }
  }, [isLoading, isAuthenticated, authCheckComplete, navigate]);

  // Cognito 설정 오류가 있어도 일정 시간 후 랜딩 화면 표시
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!authCheckComplete) {
        console.warn("Auth check timeout - showing landing screen");
        setAppState("landing");
        setAuthCheckComplete(true);
      }
    }, 3000); // 3초 후 타임아웃

    return () => clearTimeout(fallbackTimer);
  }, [authCheckComplete]);

  const handleStart = () => {
    setAppState("intro");
  };

  const handleIntroComplete = () => {
    setAppState("navigating");
    // 인트로 완료 후 로그인 페이지로 이동
    navigate("/auth");
  };

  // 로딩 중일 때 (3초 이내)
  if (appState === "loading" && !authCheckComplete) {
    return (
      <div className="min-h-screen overflow-hidden">
        <LibraryBackground />
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <LibraryBackground />

      <AnimatePresence>
        {appState === "landing" && (
          <LandingOverlay onStart={handleStart} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === "intro" && (
          <IntroMessage onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainPage;