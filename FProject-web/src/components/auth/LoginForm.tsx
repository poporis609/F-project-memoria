import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../lib/auth';
import { LoginFormData } from '../../types/auth';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface LoginFormProps {
  onSuccess?: () => void;
  onSignUpClick?: () => void;
  onForgotPasswordClick?: () => void;
}

export function LoginForm({ onSuccess, onSignUpClick, onForgotPasswordClick }: LoginFormProps) {
  const { login, isLoading, getGoogleLoginUrl, isCognitoConfigured } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      await login(data.email, data.password);
      onSuccess?.();
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    }
  };

  const handleGoogleLogin = () => {
    if (!isCognitoConfigured) {
      setError('Cognito 설정이 필요합니다. 환경 변수를 확인해주세요.');
      return;
    }

    try {
      const googleLoginUrl = getGoogleLoginUrl();
      window.location.href = googleLoginUrl;
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50/50 border border-red-200/50 rounded-md">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 이메일 입력 */}
        <div className="space-y-1.5">
          <label className="font-serif text-sm block ml-1 text-ink/80">
            이메일
          </label>
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 text-ink/40 group-focus-within:text-gold">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              placeholder="example@email.com"
              {...register('email')}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3.5 rounded-md border transition-all duration-300 font-handwriting text-lg text-ink placeholder:text-ink/30 focus:outline-none focus:bg-aged-paper bg-aged-paper/60 border-ink/10 group-hover:border-ink/30 focus:border-gold/60 focus:ring-1 focus:ring-gold/30"
            />
          </div>
          {errors.email && (
            <div className="flex items-center gap-1.5 mt-1 ml-1">
              <AlertCircle className="w-3 h-3 text-red-800/70" />
              <p className="font-handwriting text-sm text-red-800/80">{errors.email.message}</p>
            </div>
          )}
        </div>

        {/* 비밀번호 입력 */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-end">
            <label className="font-serif text-sm block ml-1 text-ink/80">
              비밀번호
            </label>
            <button 
              type="button"
              onClick={onForgotPasswordClick}
              className="text-xs font-handwriting text-ink/50 hover:text-gold transition-colors underline decoration-dotted"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 text-ink/40 group-focus-within:text-gold">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              disabled={isLoading}
              className="w-full pl-11 pr-12 py-3.5 rounded-md border transition-all duration-300 font-handwriting text-lg text-ink placeholder:text-ink/30 focus:outline-none focus:bg-aged-paper bg-aged-paper/60 border-ink/10 group-hover:border-ink/30 focus:border-gold/60 focus:ring-1 focus:ring-gold/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <div className="flex items-center gap-1.5 mt-1 ml-1">
              <AlertCircle className="w-3 h-3 text-red-800/70" />
              <p className="font-handwriting text-sm text-red-800/80">{errors.password.message}</p>
            </div>
          )}
        </div>

        {/* 로그인 버튼 */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || !isCognitoConfigured}
            className={cn(
              "w-full py-4 rounded-md flex items-center justify-center gap-3 font-serif transition-all duration-300 group disabled:opacity-70 disabled:cursor-not-allowed",
              isCognitoConfigured 
                ? "bg-[hsl(var(--leather))] text-[hsl(var(--sepia))] shadow-md hover:brightness-110 hover:shadow-lg"
                : "bg-gray-400 text-gray-600"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>기록실 입장</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* 구글 로그인 */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-ink/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-aged-paper px-2 text-ink/40 font-serif">
              또는
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || !isCognitoConfigured}
          className={cn(
            "w-full mt-4 h-12 px-6 rounded-lg flex items-center justify-center gap-3 transition-all duration-200 border border-gray-300 shadow-sm relative overflow-hidden",
            isCognitoConfigured
              ? "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-gray-100 active:shadow-inner"
              : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
          )}
          style={{
            fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          {/* 구글 로고 - 정확한 색상과 크기 */}
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          
          {/* 구글 텍스트 - 공식 스타일 */}
          <span className="text-sm font-medium text-gray-700 select-none tracking-wide">
            Sign in with Google
          </span>
          
          {/* 호버 효과를 위한 오버레이 */}
          <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition-opacity duration-200 pointer-events-none" />
        </button>
      </div>

      {/* 회원가입 링크 */}
      <div className="text-center pt-6 border-t border-ink/5">
        <button
          type="button"
          onClick={onSignUpClick}
          className="font-handwriting text-ink/60 hover:text-gold transition-colors text-sm"
        >
          아직 회원이 아니신가요? 가입하기
        </button>
      </div>
    </div>
  );
}