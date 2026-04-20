import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUserProfile } = useAuth();
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // 폼 상태
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profilePreview, setProfilePreview] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  
  // 유효성 검증 상태
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      
      console.log('🔍 Cognito 토큰 키 검색:', cognitoKeys);
      
      if (cognitoKeys.length > 0) {
        const token = localStorage.getItem(cognitoKeys[0]);
        console.log('✅ 토큰 발견:', token ? '있음' : '없음');
        console.log('토큰 길이:', token?.length);
        console.log('토큰 앞 50자:', token?.substring(0, 50));
        
        // 빈 문자열 체크
        if (token && token.trim().length > 0) {
          return token;
        }
        console.warn('⚠️ 토큰이 비어있습니다');
      }
      
      // 방법 2: user.username이 있으면 직접 키 생성
      if (user?.username) {
        const tokenKey = `CognitoIdentityServiceProvider.${clientId}.${user.username}.idToken`;
        const token = localStorage.getItem(tokenKey);
        console.log('🔍 직접 키로 검색:', tokenKey, token ? '있음' : '없음');
        console.log('토큰 길이:', token?.length);
        
        // 빈 문자열 체크
        if (token && token.trim().length > 0) {
          return token;
        }
      }
      
      console.warn('⚠️ 토큰을 찾을 수 없습니다');
      return null;
    } catch (error) {
      console.error('❌ 토큰 가져오기 실패:', error);
      return null;
    }
  };

  // 프로필 정보 로드
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !isAuthenticated) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const token = getAuthToken();
        if (!token) {
          console.warn('토큰이 없습니다. API 호출 불가');
          setIsLoadingProfile(false);
          return;
        }

        // API에서 프로필 정보 가져오기
        const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
        const response = await fetch(`${authApiUrl}/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('📥 프로필 로드 응답 상태:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('📥 프로필 로드 응답 데이터:', data);
          const profile = data.data;
          console.log('📥 프로필 데이터:', profile);
          
          setNickname(profile.nickname || profile.preferred_username || "");
          setName(profile.name || "");
          setBio(profile.bio || "");
          setPhoneNumber(profile.phoneNumber || profile.phone_number || "");
          setProfilePreview(profile.profileImageUrl || profile.profile_image_url || "");
        } else {
          const errorText = await response.text();
          console.error('❌ 프로필 로드 실패:', response.status, errorText);
        }
      } catch (error) {
        console.error('프로필 로드 중 오류:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, isAuthenticated]);

  // 닉네임 유효성 검증
  const validateNickname = (value: string): string | null => {
    if (value.length < 2 || value.length > 20) {
      return "닉네임은 2-20자 사이여야 합니다";
    }
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(value)) {
      return "닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다";
    }
    return null;
  };

  // Bio 유효성 검증
  const validateBio = (value: string): string | null => {
    if (value.length > 500) {
      return "자기소개는 최대 500자까지 입력 가능합니다";
    }
    return null;
  };

  // 전화번호 유효성 검증
  const validatePhoneNumber = (value: string): string | null => {
    if (!value) return null; // 선택사항
    if (!/^[0-9-+() ]+$/.test(value)) {
      return "올바른 전화번호 형식이 아닙니다";
    }
    return null;
  };

  // 닉네임 변경 핸들러
  const handleNicknameChange = (value: string) => {
    setNickname(value);
    const error = validateNickname(value);
    setNicknameError(error);
  };

  // Bio 변경 핸들러
  const handleBioChange = (value: string) => {
    setBio(value);
    const error = validateBio(value);
    setBioError(error);
  };

  // 전화번호 변경 핸들러
  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    const error = validatePhoneNumber(value);
    setPhoneError(error);
  };

  const handleCancel = () => {
    navigate("/mypage");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast({
        title: "오류",
        description: "사용자 인증 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // 모든 필드 유효성 검증
    const nicknameErr = validateNickname(nickname);
    const bioErr = validateBio(bio);
    const phoneErr = validatePhoneNumber(phoneNumber);

    if (nicknameErr || bioErr || phoneErr) {
      setNicknameError(nicknameErr);
      setBioError(bioErr);
      setPhoneError(phoneErr);
      return;
    }

    setIsSaving(true);

    try {
      const token = getAuthToken();
      
      // 토큰이 없으면 Cognito 정보만 로컬에 저장
      if (!token) {
        console.warn('⚠️ 토큰 없음 - 로컬 저장만 수행');
        
        // localStorage에 저장 (임시)
        if (profilePreview) {
          localStorage.setItem("profileImage", profilePreview);
        }
        if (nickname) {
          localStorage.setItem("profileNickname", nickname);
        }
        
        toast({
          title: "프로필 수정 완료",
          description: "프로필 정보가 로컬에 저장되었습니다. (서버 동기화는 다음 로그인 시 수행됩니다)",
        });

        setIsCompleteOpen(true);
        return;
      }

      // Step 1: Upload profile image if changed
      if (profileFile) {
        console.log('📤 이미지 업로드 시작:', profileFile.name, profileFile.size, profileFile.type);
        
        const formData = new FormData();
        formData.append('image', profileFile);

        const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
        const imageUrl = `${authApiUrl}/user/profile/image`;
        console.log('📤 이미지 업로드 URL:', imageUrl);

        const imageResponse = await fetch(imageUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        console.log('📤 이미지 업로드 응답 상태:', imageResponse.status);

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error('❌ 이미지 업로드 실패:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || '프로필 이미지 업로드에 실패했습니다.');
          } catch {
            throw new Error(`프로필 이미지 업로드 실패: ${imageResponse.status} - ${errorText}`);
          }
        }
        
        // 업로드 성공 후 응답에서 이미지 URL 받기
        const imageData = await imageResponse.json();
        console.log('✅ 프로필 이미지 업로드 성공 - 전체 응답:', JSON.stringify(imageData, null, 2));
        console.log('📦 imageData.data:', imageData.data);
        console.log('📦 imageData.data?.profileImageUrl:', imageData.data?.profileImageUrl);
        console.log('📦 imageData.data?.profile_image_url:', imageData.data?.profile_image_url);
        
        // 응답에서 이미지 URL 추출하여 미리보기 업데이트
        if (imageData.data?.profileImageUrl || imageData.data?.profile_image_url) {
          const uploadedImageUrl = imageData.data.profileImageUrl || imageData.data.profile_image_url;
          setProfilePreview(uploadedImageUrl);
          console.log('📸 업로드된 이미지 URL 설정:', uploadedImageUrl);
        } else {
          console.warn('⚠️ 응답에 이미지 URL이 없습니다');
        }
      }

      // Step 2: Update other profile fields
      const updates: any = {};
      
      if (nickname.trim()) {
        updates.nickname = nickname.trim();
      }
      if (name.trim()) {
        updates.name = name.trim();
      }
      if (bio.trim() !== undefined) {
        updates.bio = bio.trim();
      }
      if (phoneNumber !== undefined) {
        updates.phone_number = phoneNumber.trim() || null;
      }

      console.log('📝 프로필 업데이트 데이터:', updates);

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const authApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.AUTH_API_PREFIX || "/auth"}`;
        const profileUrl = `${authApiUrl}/user/profile`;
        console.log('📝 프로필 업데이트 URL:', profileUrl);

        const response = await fetch(profileUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        console.log('📝 프로필 업데이트 응답 상태:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ 프로필 업데이트 실패:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || '프로필 업데이트에 실패했습니다.');
          } catch {
            throw new Error(`프로필 업데이트 실패: ${response.status} - ${errorText}`);
          }
        }
      }

      // AuthContext의 user 정보 업데이트
      updateUserProfile({
        name: name.trim(),
        nickname: nickname.trim(),
      });

      toast({
        title: "프로필 수정 완료",
        description: "프로필 정보가 성공적으로 업데이트되었습니다.",
      });

      setIsCompleteOpen(true);
    } catch (error) {
      console.error("프로필 수정 실패:", error);
      toast({
        title: "수정 실패",
        description: error instanceof Error ? error.message : "프로필 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = () => {
    setIsCompleteOpen(false);
    // state를 전달하여 MyPage에서 프로필을 새로고침하도록 함
    navigate("/mypage", { state: { refreshProfile: true } });
  };

  const handleProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    // Store the file for upload
    setProfileFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfilePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileClear = () => {
    setProfilePreview("");
    setProfileFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 로딩 중
  if (isLoadingProfile) {
    return (
      <MainLayout>
        <div className="min-h-screen py-12 px-4 bg-background">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen py-12 px-4 bg-background">
        <div className="max-w-2xl mx-auto space-y-10">
          <section className="bg-card rounded-xl shadow-md border border-border p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              정보 수정
            </h2>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  이메일
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground"
                  placeholder="이메일 주소"
                />
                <p className="text-xs text-muted-foreground">
                  이메일은 변경할 수 없습니다.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  프로필 사진
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex flex-1 items-center justify-center gap-4 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-center transition-colors hover:bg-secondary/40"
                  >
                    <span className="h-16 w-16 overflow-hidden rounded-full border border-border bg-background flex items-center justify-center">
                      {profilePreview ? (
                        <img
                          src={profilePreview}
                          alt="프로필 사진"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-7 w-7 text-muted-foreground" />
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      사진을 눌러 변경하세요
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
                    onClick={handleProfileClear}
                  >
                    삭제
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileChange}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="이름을 입력하세요"
                />
              </div>
              
              <div className="space-y-2">
                <label
                  htmlFor="nickname"
                  className="text-sm font-medium text-foreground"
                >
                  닉네임 *
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={nickname}
                  onChange={(event) => handleNicknameChange(event.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    nicknameError ? "border-red-500 bg-red-50/10" : "border-border bg-background"
                  }`}
                  placeholder="닉네임을 입력하세요 (2-20자)"
                  required
                />
                {nicknameError && (
                  <p className="text-xs text-red-500">{nicknameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  한글, 영문, 숫자, 언더스코어를 사용 가능합니다
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium text-foreground"
                >
                  자기소개
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={bio}
                  onChange={(event) => handleBioChange(event.target.value)}
                  rows={4}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    bioError ? "border-red-500 bg-red-50/10" : "border-border bg-background"
                  }`}
                  placeholder="자기소개를 입력하세요 (최대 500자)"
                />
                <div className="flex justify-between items-center">
                  {bioError && (
                    <p className="text-xs text-red-500">{bioError}</p>
                  )}
                  <p className={`text-xs ml-auto ${bio.length > 500 ? "text-red-500" : "text-muted-foreground"}`}>
                    {bio.length} / 500
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="phoneNumber"
                  className="text-sm font-medium text-foreground"
                >
                  전화번호
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => handlePhoneNumberChange(event.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    phoneError ? "border-red-500 bg-red-50/10" : "border-border bg-background"
                  }`}
                  placeholder="전화번호를 입력하세요 (선택사항)"
                />
                {phoneError && (
                  <p className="text-xs text-red-500">{phoneError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row pt-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isSaving || !!nicknameError || !!bioError || !!phoneError}
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? "수정 중..." : "수정"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {isCompleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={handleConfirm}
          />
          <div className="relative w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <p className="text-sm text-foreground">수정 되었습니다.</p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={handleConfirm}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default EditProfile;