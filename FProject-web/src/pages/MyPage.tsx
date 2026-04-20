import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Edit,
  LogOut,
  Lock,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant?: "default" | "danger";
}

const menuItems: MenuItem[] = [
  {
    id: "edit",
    label: "정보 수정",
    icon: Edit,
    description: "프로필 정보를 변경하세요",
  },
  {
    id: "changePassword",
    label: "비밀번호 변경",
    icon: Lock,
    description: "계정 비밀번호를 변경하세요",
  },
  {
    id: "logout",
    label: "로그아웃",
    icon: LogOut,
    description: "계정에서 로그아웃합니다",
  },
  {
    id: "withdraw",
    label: "회원 탈퇴",
    icon: LogOut,
    description: "계정을 삭제합니다",
    variant: "danger",
  },
];

const MyPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { displayName, email, userId } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isWithdrawAgreed, setIsWithdrawAgreed] = useState(false);
  const [isWithdrawCompleteOpen, setIsWithdrawCompleteOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLogoutCompleteOpen, setIsLogoutCompleteOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangePasswordCompleteOpen, setIsChangePasswordCompleteOpen] = useState(false);
  const [isVerifyCodeOpen, setIsVerifyCodeOpen] = useState(false);
  
  // Password change state
  const [verificationCode, setVerificationCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // 프로필 정보 상태 (백엔드 API에서 가져옴)
  const [profileData, setProfileData] = useState<{
    nickname: string;
    name: string;
    bio: string;
    profileImageUrl: string;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // 실제 사용자 정보 사용 (API 우선, 로딩 중에는 "사용자")
  const profileNickname = isLoadingProfile ? "사용자" : (profileData?.nickname || displayName || "사용자");
  
  // 프로필 이미지 (API 우선, localStorage 폴백)
  const storedProfileImage =
    typeof window !== "undefined" ? localStorage.getItem("profileImage") : null;
  const profileImage = profileData?.profileImageUrl || storedProfileImage || "";
  
  // 프로필 이미지 디버깅
  useEffect(() => {
    console.log('🖼️ MyPage - 프로필 이미지 상태:', {
      'API profileImageUrl': profileData?.profileImageUrl,
      'localStorage': storedProfileImage,
      'final profileImage': profileImage,
      'isLoadingProfile': isLoadingProfile
    });
  }, [profileData, storedProfileImage, profileImage, isLoadingProfile]);
  
  // Helper function to get Cognito ID token
  const getAuthToken = (): string | null => {
    try {
      // 방법 1: Cognito 표준 키 패턴으로 찾기
      const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
      
      if (!clientId) {
        console.error('VITE_COGNITO_CLIENT_ID가 설정되지 않았습니다');
        return null;
      }
      
      // localStorage에서 Cognito 관련 모든 키 찾기
      const cognitoKeys = Object.keys(localStorage).filter(key => 
        key.includes('CognitoIdentityServiceProvider') && 
        key.includes(clientId) &&
        key.endsWith('.idToken')
      );
      
      console.log('🔍 MyPage - Cognito 토큰 키 검색:', cognitoKeys);
      
      if (cognitoKeys.length > 0) {
        const token = localStorage.getItem(cognitoKeys[0]);
        console.log('✅ MyPage - 토큰 발견:', token ? '있음' : '없음');
        
        // 빈 문자열 체크
        if (token && token.trim().length > 0) {
          return token;
        }
        console.warn('⚠️ MyPage - 토큰이 비어있습니다');
      }
      
      // 방법 2: user 정보가 있으면 직접 키 생성
      if (userId) {
        const tokenKey = `CognitoIdentityServiceProvider.${clientId}.${userId}.idToken`;
        const token = localStorage.getItem(tokenKey);
        console.log('🔍 MyPage - 직접 키로 검색:', tokenKey, token ? '있음' : '없음');
        
        // 빈 문자열 체크
        if (token && token.trim().length > 0) {
          return token;
        }
      }
      
      console.warn('⚠️ MyPage - 토큰을 찾을 수 없습니다');
      return null;
    } catch (error) {
      console.error('❌ MyPage - 토큰 가져오기 실패:', error);
      return null;
    }
  };

  // 프로필 정보 로드
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          console.warn('MyPage - 토큰이 없어서 프로필 로드 스킵');
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
          console.log('📥 MyPage - 프로필 로드 성공:', profile);
          console.log('📸 프로필 이미지 URL:', profile.profileImageUrl || profile.profile_image_url);
          
          setProfileData({
            nickname: profile.nickname || profile.preferred_username || '',
            name: profile.name || '',
            bio: profile.bio || '',
            profileImageUrl: profile.profileImageUrl || profile.profile_image_url || '',
          });
        } else {
          console.warn('MyPage - 프로필 로드 실패:', response.status);
        }
      } catch (error) {
        console.error('MyPage - 프로필 로드 오류:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // 페이지 포커스 시 프로필 새로고침
  useEffect(() => {
    const handleFocus = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
        const response = await fetch(`${authApiUrl}/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const profile = data.data;
          console.log('🔄 MyPage - 포커스 시 프로필 새로고침:', profile);
          
          setProfileData({
            nickname: profile.nickname || profile.preferred_username || '',
            name: profile.name || '',
            bio: profile.bio || '',
            profileImageUrl: profile.profileImageUrl || profile.profile_image_url || '',
          });
        }
      } catch (error) {
        console.error('MyPage - 포커스 시 프로필 로드 오류:', error);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId]);

  const closeWithdrawModal = () => {
    setIsWithdrawOpen(false);
    setIsWithdrawAgreed(false);
  };

  const handleWithdrawConfirm = async () => {
    if (!userId) {
      toast({
        title: "오류",
        description: "사용자 인증 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = getAuthToken();

      if (!token) {
        toast({
          title: "오류",
          description: "인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        return;
      }

      // Call backend API to delete account
      const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
      const response = await fetch(`${authApiUrl}/user/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '회원 탈퇴에 실패했습니다.');
      }

      // Close modal and show completion message
      setIsWithdrawOpen(false);
      setIsWithdrawAgreed(false);
      setIsWithdrawCompleteOpen(true);

      // Sign out and redirect after 2 seconds
      setTimeout(async () => {
        try {
          await logout();
        } catch (err) {
          console.error('로그아웃 실패:', err);
        } finally {
          navigate('/');
        }
      }, 2000);

    } catch (error) {
      console.error("회원 탈퇴 실패:", error);
      toast({
        title: "회원 탈퇴 실패",
        description: error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      setIsWithdrawOpen(false);
      setIsWithdrawAgreed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const closeWithdrawCompleteModal = () => {
    setIsWithdrawCompleteOpen(false);
  };

  const openLogoutConfirm = () => {
    setIsLogoutConfirmOpen(true);
  };

  const closeLogoutConfirm = () => {
    setIsLogoutConfirmOpen(false);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      setIsLogoutConfirmOpen(false);
      navigate("/", { replace: true }); // 메인 페이지로 이동 (인트로 화면)
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsLogoutConfirmOpen(false);
    }
  };

  const closeLogoutComplete = () => {
    setIsLogoutCompleteOpen(false);
  };

  const toggleAssistant = () => {
    // Removed assistant feature
  };

  const closeChangePasswordModal = () => {
    setIsChangePasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setVerificationCode("");
  };

  const closeVerifyCodeModal = () => {
    setIsVerifyCodeOpen(false);
    setVerificationCode("");
  };

  const handleChangePasswordSubmit = async () => {
    // 비밀번호 확인 검증
    if (newPassword !== confirmPassword) {
      toast({
        title: "오류",
        description: "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!userId || !email) {
      toast({
        title: "오류",
        description: "사용자 인증 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "오류",
          description: "인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        return;
      }

      // 비밀번호 재설정 코드를 이메일로 전송
      const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
      const response = await fetch(`${authApiUrl}/user/password-reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '비밀번호 변경 요청에 실패했습니다.');
      }

      // 첫번째 모달 닫고 인증 코드 입력 모달 열기
      setIsChangePasswordOpen(false);
      setIsVerifyCodeOpen(true);
      
      toast({
        title: "인증 코드 전송",
        description: "이메일로 인증 코드가 전송되었습니다.",
      });
    } catch (error) {
      console.error("비밀번호 변경 실패:", error);
      toast({
        title: "비밀번호 변경 실패",
        description: error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!userId || !email) {
      toast({
        title: "오류",
        description: "사용자 인증 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "오류",
          description: "인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        return;
      }

      // 인증 코드로 비밀번호 변경 확인
      const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
      const response = await fetch(`${authApiUrl}/user/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: verificationCode,
          newPassword: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '비밀번호 변경에 실패했습니다.');
      }

      // 성공 시 모든 모달 닫고 완료 모달 열기
      setIsVerifyCodeOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setIsChangePasswordCompleteOpen(true);
      
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });
    } catch (error) {
      console.error("비밀번호 변경 실패:", error);
      toast({
        title: "비밀번호 변경 실패",
        description: error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다. 인증 코드를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeChangePasswordComplete = () => {
    setIsChangePasswordCompleteOpen(false);
  };

  const handleAssistantSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Removed assistant feature
  };

  useEffect(() => {
    // Removed assistant scroll effect
  }, []);

  return (
    <MainLayout>
      <div className="min-h-screen py-12 px-4 bg-background">
        <div className="max-w-2xl mx-auto space-y-10">
          {/* Profile Section */}
          <section className="bg-card rounded-xl shadow-md border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-secondary p-1">
                  <div className="w-full h-full rounded-full bg-background overflow-hidden flex items-center justify-center">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="프로필 사진"
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('프로필 이미지 로드 실패:', profileImage);
                          console.error('CORS 에러일 가능성이 높습니다. S3 버킷 CORS 설정을 확인하세요.');
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ 프로필 이미지 로드 성공:', profileImage);
                        }}
                      />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-yellow-600/30" />
              </div>

              <div className="flex-1">
                <h2 className="font-serif text-2xl text-primary gold-accent">
                  {profileNickname}님
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {email}
                </p>
              </div>
            </div>
          </section>

          {/* Menu */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
              {menuItems
                .filter((item) => item.variant !== "danger")
                .map((item, index, arr) => {
                  const Icon = item.icon;
                  const isLast = index === arr.length - 1;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "logout") {
                          openLogoutConfirm();
                        }
                        if (item.id === "edit") {
                          navigate("/edit-profile");
                        }
                        if (item.id === "changePassword") {
                          setIsChangePasswordOpen(true);
                        }
                      }}
                      className={cn(
                        "w-full p-5 text-left transition-all duration-200 group relative hover:bg-secondary/30",
                        !isLast && "border-b border-border"
                      )}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-700 group-hover:bg-yellow-600 transition-colors" />

                      <div className="flex items-center gap-4 pl-2">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-foreground/60 group-hover:text-yellow-600 transition-colors" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-yellow-600 transition-colors">
                            {item.label}
                          </h3>
                          <p className="handwriting text-lg text-muted-foreground leading-snug">
                            {item.description}
                          </p>
                        </div>

                        <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                          →
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
              {menuItems
                .filter((item) => item.variant === "danger")
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setIsWithdrawOpen(true)}
                      className="w-full p-5 text-left transition-all duration-200 group relative hover:bg-red-50/10"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50 group-hover:bg-red-500 transition-colors" />

                      <div className="flex items-center gap-4 pl-2">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-red-500" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-500">
                            {item.label}
                          </h3>
                          <p className="handwriting text-lg text-muted-foreground leading-snug">
                            {item.description}
                          </p>
                        </div>

                        <div className="text-muted-foreground group-hover:text-red-500/70 transition-colors">
                          →
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeWithdrawModal}
          />
          <div className="relative w-full max-w-lg bg-card rounded-xl shadow-xl border border-border p-6">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={closeWithdrawModal}
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-foreground">회원 탈퇴</h3>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line mb-6">
              회원정보 및 기록, 사진 등 서비스 이용기록은 모두 삭제되며, 삭제된 데이터는 복구되지 않습니다.
              {"\n"}삭제되는 내용을 확인하시고 필요한 데이터는 미리 백업을 해주세요.
            </p>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-red-500"
                checked={isWithdrawAgreed}
                onChange={(event) => setIsWithdrawAgreed(event.target.checked)}
              />
              <span className="text-sm text-foreground">
                안내 사항을 확인하였으며, 이에 동의합니다.
              </span>
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
                onClick={closeWithdrawModal}
              >
                취소
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600",
                  !isWithdrawAgreed && "pointer-events-none opacity-60"
                )}
                disabled={!isWithdrawAgreed}
                onClick={handleWithdrawConfirm}
              >
                회원 탈퇴
              </button>
            </div>
          </div>
        </div>
      )}

      {isWithdrawCompleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeWithdrawCompleteModal}
          />
          <div className="relative w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <p className="text-sm text-foreground">회원 탈퇴 되었습니다.</p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={closeWithdrawCompleteModal}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeLogoutConfirm}
          />
          <div className="relative w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <p className="text-sm text-foreground">로그아웃하시겠습니까?</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
                onClick={closeLogoutConfirm}
              >
                취소
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={handleLogoutConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {isLogoutCompleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeLogoutComplete}
          />
          <div className="relative w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <p className="text-sm text-foreground">로그아웃 되었습니다.</p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={closeLogoutComplete}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeChangePasswordModal}
          />
          <div className="relative w-full max-w-lg bg-card rounded-xl shadow-xl border border-border p-6">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={closeChangePasswordModal}
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-foreground">비밀번호 변경</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              새로운 비밀번호를 입력해주세요. 이메일로 인증 코드가 전송됩니다.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="text-sm font-medium text-foreground"
                >
                  새 비밀번호
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="새 비밀번호를 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-foreground"
                >
                  새 비밀번호 확인
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    confirmPassword && newPassword !== confirmPassword
                      ? "border-red-500 bg-red-50/10"
                      : "border-border bg-background"
                  }`}
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
                onClick={closeChangePasswordModal}
                disabled={isLoading}
              >
                취소
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleChangePasswordSubmit}
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {isVerifyCodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeVerifyCodeModal}
          />
          <div className="relative w-full max-w-lg bg-card rounded-xl shadow-xl border border-border p-6">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={closeVerifyCodeModal}
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-foreground mb-2">인증 코드 입력</h3>
            <p className="text-sm text-muted-foreground mb-6">
              이메일로 전송된 6자리 인증 코드를 입력해주세요.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  인증 코드
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="6자리 코드 입력"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
                onClick={closeVerifyCodeModal}
                disabled={isLoading}
              >
                취소
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleVerifyCodeSubmit}
                disabled={!verificationCode.trim() || isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {isChangePasswordCompleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={closeChangePasswordComplete}
          />
          <div className="relative w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <p className="text-sm text-foreground">
              비밀번호 변경이 완료되었습니다.
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={closeChangePasswordComplete}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default MyPage;