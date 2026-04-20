import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
}

export function PublicRoute({ 
  children, 
  redirectTo = '/journal', // 기본값을 일기 페이지로 변경
  redirectIfAuthenticated = true 
}: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 이미 인증된 사용자가 로그인 페이지에 접근하려는 경우
  if (isAuthenticated && redirectIfAuthenticated) {
    // 이미 로그인된 사용자는 일기 페이지로 리다이렉트
    return <Navigate to={redirectTo} replace />;
  }

  // 인증되지 않은 경우 또는 redirectIfAuthenticated가 false인 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
}

export default PublicRoute;