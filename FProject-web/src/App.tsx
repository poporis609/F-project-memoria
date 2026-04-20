import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainPage from "./pages/MainPage"
import Index from "./pages/Index";

import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import History from "./pages/History";
import LibraryPage from "./pages/LibraryPage";
import LibraryDetailPage from "./pages/LibraryDetailPage";
import { LibraryProvider } from "./contexts/LibraryContext";
import MyPage from "./pages/MyPage";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import Report from "./pages/Report";
import NotFound from "./pages/NotFound";

// 인증 관련 컴포넌트
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";

const queryClient = new QueryClient();

const App = () => {
  console.log('🚀 App 컴포넌트 렌더링');
  console.log('현재 경로:', window.location.pathname);
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          
          {/* 루트 경로 - 인트로 화면 (인증 상태 무관하게 접근 가능) */}
          <Route path="/" element={<MainPage />} />
          
          {/* 공개 라우트 - 인증되지 않은 사용자용 */}
          <Route 
            path="/auth" 
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } 
          />
          
          {/* OAuth 콜백 처리 */}
          <Route 
            path="/auth/callback" 
            element={<AuthCallback />}
          />
          
          {/* 보호된 라우트 - 인증된 사용자만 접근 가능 */}
          <Route 
            path="/journal" 
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } 
          />
          
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <LibraryProvider>
                  <Outlet />
                </LibraryProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<LibraryPage />} />
            <Route path=":type" element={<LibraryDetailPage />} />
          </Route>
          
          <Route 
            path="/mypage" 
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/edit-profile" 
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/report" 
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
