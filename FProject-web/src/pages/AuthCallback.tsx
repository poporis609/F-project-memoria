import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// 전역 변수로 코드 사용 여부 추적 (React Strict Mode 대응)
const usedCodes = new Set<string>();

/**
 * Google OAuth 로그인 후 Cognito Hosted UI에서 리다이렉트되는 콜백 페이지
 *
 * 처리 과정:
 * 1. URL에서 인증 코드 파싱
 * 2. 토큰 교환 처리
 * 3. 성공 시 원래 페이지 또는 메인 페이지로 리다이렉트
 * 4. 실패 시 로그인 페이지로 리다이렉트
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { parseAuthCallback } = useAuth();
  const hasProcessed = useRef(false); // 중복 실행 방지
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 이미 처리했다면 무시
    if (hasProcessed.current || isProcessing) {
      console.log('🔄 OAuth 콜백이 이미 처리 중이거나 완료되었습니다. 무시합니다.');
      return;
    }

    const handleCallback = async () => {
      try {
        hasProcessed.current = true; // 처리 시작 표시
        setIsProcessing(true);
        
        console.log('🔍 OAuth 콜백 처리 시작');
        console.log('- 현재 URL:', window.location.href);
        console.log('- 환경변수 REDIRECT_URI:', import.meta.env.VITE_OAUTH_REDIRECT_URI);
        
        // 현재 URL 전체를 저장
        const currentUrl = window.location.href;
        
        // URL에서 에러가 있는지 확인
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
          console.error('❌ OAuth 에러:', error);
          const errorDescription = urlParams.get('error_description');
          console.error('에러 설명:', errorDescription);

          // 에러 메시지 파싱 및 개선
          let userFriendlyError = 'Google 로그인에 실패했습니다.';

          if (errorDescription) {
            // PreSignUp 에러 메시지 파싱
            if (errorDescription.includes('PreSignUp failed with error')) {
              const match = errorDescription.match(/PreSignUp failed with error (.+)/);
              if (match && match[1]) {
                userFriendlyError = match[1].trim();
              }
            } else {
              userFriendlyError = errorDescription;
            }
          }

          toast({
            title: "로그인 실패",
            description: userFriendlyError,
            variant: "destructive"
          });

          // 에러가 있으면 로그인 페이지로 리다이렉트
          navigate('/auth', {
            replace: true,
            state: { error: userFriendlyError }
          });
          return;
        }
        
        // 인증 코드가 있는지 확인
        const code = urlParams.get('code');
        if (!code) {
          console.error('❌ 인증 코드가 없습니다');
          
          toast({
            title: "로그인 실패",
            description: "인증 코드를 찾을 수 없습니다.",
            variant: "destructive"
          });
          
          navigate('/auth', {
            replace: true,
            state: { error: '인증 코드를 찾을 수 없습니다.' }
          });
          return;
        }
        
        // 이미 사용된 코드인지 확인 (React Strict Mode 대응)
        if (usedCodes.has(code)) {
          console.log('⚠️ 이미 사용된 인증 코드입니다. 무시합니다.');
          return;
        }
        
        // 코드를 사용됨으로 표시
        usedCodes.add(code);
        
        console.log('✅ OAuth 코드 확인됨:', code.substring(0, 10) + '...');
        
        // URL에서 코드 제거 (중복 사용 방지)
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 현재 URL에서 OAuth 콜백 처리
        await parseAuthCallback(currentUrl);
        
        console.log('✅ OAuth 콜백 처리 완료');
        
        toast({
          title: "로그인 성공",
          description: "Google 로그인이 완료되었습니다."
        });
        
        // 성공 시 원래 가려던 페이지 또는 메인 페이지로 이동
        const from = (location.state as any)?.from?.pathname || '/journal';
        navigate(from, { replace: true });
        
      } catch (error: any) {
        console.error('❌ OAuth callback error:', error);
        
        toast({
          title: "로그인 실패",
          description: error.message || "Google 로그인 처리에 실패했습니다.",
          variant: "destructive"
        });
        
        // 오류 발생 시 로그인 페이지로 이동
        navigate('/auth', {
          replace: true,
          state: { error: error.message || 'Google 로그인 처리에 실패했습니다.' }
        });
      } finally {
        setIsProcessing(false);
      }
    };

    // 약간의 지연을 두고 실행 (React Strict Mode 대응)
    const timeoutId = setTimeout(handleCallback, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // 빈 의존성 배열로 한 번만 실행

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          로그인 처리 중...
        </h2>
        <p className="text-sm text-muted-foreground">
          잠시만 기다려주세요
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;