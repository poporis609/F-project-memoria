import { useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FolderOpen, Image, FileText, Film, File, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import CircularGallery from "@/components/CircularGallery";
import { useNavigate } from "react-router-dom";
import { useLibraryContext } from "@/contexts/LibraryContext";
import { LibraryItemType, LibraryTypeConfig } from "@/types/library";
import { AddItemModal } from "@/components/library/AddItemModal";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const libraryTypeConfigs: LibraryTypeConfig[] = [
  {
    type: "image",
    label: "사진",
    icon: "Image",
    color: "type-image",
    route: "/library/image",
  },
  {
    type: "document",
    label: "문서",
    icon: "FileText",
    color: "type-document",
    route: "/library/document",
  },
  {
    type: "file",
    label: "파일",
    icon: "Folder",
    color: "type-file",
    route: "/library/file",
  },
  {
    type: "video",
    label: "동영상",
    icon: "Video",
    color: "type-video",
    route: "/library/video",
  },
];

const getIcon = (type: "image" | "document" | "video" | "file") => {
  switch (type) {
    case "image":
      return Image;
    case "document":
      return FileText;
    case "video":
      return Film;
    case "file":
      return File;
  }
};

const LibraryPage = () => {
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUploadType, setSelectedUploadType] = useState<LibraryItemType | null>(null);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, isCognitoConfigured } = useAuth();
  const { displayName, userId, isLoading: userLoading } = useCurrentUser();
  const { getLatestItemByType, getItemCountByType, getItemsByType, addItem, items, loading, error } = useLibraryContext();
  const [profileNickname, setProfileNickname] = useState<string>("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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
        console.error('LibraryPage - 프로필 로드 오류:', error);
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

  // 로딩 상태 처리
  if (authLoading || userLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="font-serif text-muted-foreground">라이브러리를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 전까지의 fallback)
  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (value?: string | Date) => {
    if (!value) {
      return "날짜 없음";
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "날짜 없음";
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const typeCards = useMemo(
    () =>
      libraryTypeConfigs.map((config) => ({
        ...config,
        // 각 타입별 최신 항목/개수를 카드에 노출.
        latestItem: getLatestItemByType(config.type),
        itemCount: getItemCountByType(config.type),
      })),
    [getLatestItemByType, getItemCountByType]
  );

  // CircularGallery용 이미지 데이터 준비
  const galleryItems = useMemo(() => {
    // API 연동 실패 시 빈 배열 반환 (기본 이미지 사용 안 함)
    if (error) return [];
    
    const imageItems = items
      .filter(item => item.type === 'image' && item.thumbnail)
      .slice(0, 30) // 최신 30개만 사용
      .map(item => ({
        image: item.thumbnail!,
        text: item.name
      }));
    
    return imageItems.length > 0 ? imageItems : [];
  }, [items, error]);

  useEffect(() => {
    // 드롭다운이 열려 있을 때 바깥 클릭으로 닫기
    if (!isUploadMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!uploadMenuRef.current) {
        return;
      }

      if (!uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadMenuOpen]);

  const handleUploadClick = (target: LibraryItemType) => {
    setIsUploadMenuOpen(false);
    setSelectedUploadType(target);
    setIsAddModalOpen(true);
  };

  const handleAddItem = (item: any) => {
    addItem(item);
    setIsAddModalOpen(false);
    setSelectedUploadType(null);
  };

  const getTypeLabel = (type: LibraryItemType): string => {
    const config = libraryTypeConfigs.find(c => c.type === type);
    return config?.label || type;
  };

  return (
    <MainLayout>
      <div className="min-h-screen py-12 px-4 relative">
        {/* 배경 이미지 레이어 - MainLayout 위에 표시 */}
        <div 
          className="fixed inset-0 bg-cover bg-center pointer-events-none"
          style={{ 
            backgroundImage: 'url(/library_bg.png)',
            zIndex: 0
          }}
        />
        {/* 반투명 오버레이 */}
        <div 
          className="fixed inset-0 bg-background/70 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        
        <div className="max-w-5xl mx-auto relative" style={{ zIndex: 10 }}>
          {/* Header */}
          <header className="text-center mb-12 animate-fade-in">
            <h1 className="font-serif text-3xl text-primary mb-2 gold-accent">
              {userDisplayName}님의 라이브러리
            </h1>
            <p className="font-handwriting text-xl text-muted-foreground">
              사진, 영상, 문서를 보관하세요
            </p>
            {!isCognitoConfigured && (
              <div className="mt-4 p-3 bg-yellow-50/50 border border-yellow-200/50 rounded-md">
                <p className="text-xs text-yellow-800">
                  💡 Cognito 설정이 완료되면 실제 사용자별 데이터가 표시됩니다.
                </p>
              </div>
            )}
          </header>

          {/* API 연동 실패 에러 메시지 */}
          {error && (
            <div className="mb-8 p-6 rounded-lg border border-red-200 bg-red-50/50 paper-texture">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-serif text-lg text-red-900 mb-1">API 연동 실패</h3>
                  <p className="font-serif text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* CircularGallery - 항상 표시 */}
          <div className="w-full h-[450px] my-8 relative rounded-2xl bg-black/5 overflow-hidden border border-[#D9C5B2]/20 shadow-inner">
            <CircularGallery 
              key="main-gallery" 
              items={galleryItems}
              bend={3} 
              textColor="#8C7365" 
              borderRadius={0.05} 
            />
          </div>

          {/* Upload dropdown */}
          <div className="flex justify-end mb-8">
            <div ref={uploadMenuRef} className="relative">
              <button
                type="button"
                className="bg-transparent border-2 border-amber-800/20 px-5 py-3 rounded-md flex items-center gap-2 font-serif text-amber-100 hover:bg-amber-900/20 hover:border-amber-800/40 transition-colors"
                aria-haspopup="menu"
                aria-expanded={isUploadMenuOpen}
                onClick={() => {
                  setIsUploadMenuOpen((prev) => !prev);
                }}
              >
                <img src="/dropdown.png" alt="드롭다운" className="w-12 h-12" />
                <span className="text-xl font-semibold"> 추가 </span>
              </button>

              {isUploadMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 rounded-lg border-3 border-amber-900/50 bg-amber-50 shadow-2xl backdrop-blur-md z-20 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full text-left px-5 py-3.5 text-base font-serif font-semibold text-amber-950 hover:bg-amber-200 hover:text-amber-950 transition-colors border-b-2 border-amber-900/20"
                    onClick={() => handleUploadClick("video")}
                  >
                    동영상
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-5 py-3.5 text-base font-serif font-semibold text-amber-950 hover:bg-amber-200 hover:text-amber-950 transition-colors border-b-2 border-amber-900/20"
                    onClick={() => handleUploadClick("image")}
                  >
                    사진
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-5 py-3.5 text-base font-serif font-semibold text-amber-950 hover:bg-amber-200 hover:text-amber-950 transition-colors border-b-2 border-amber-900/20"
                    onClick={() => handleUploadClick("document")}
                  >
                    문서
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-5 py-3.5 text-base font-serif font-semibold text-amber-950 hover:bg-amber-200 hover:text-amber-950 transition-colors"
                    onClick={() => handleUploadClick("file")}
                  >
                    파일
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loveable-style cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {typeCards.map((item, index) => {
              const Icon = getIcon(item.type);

              return (
                <button
                  key={item.type}
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "group relative paper-texture rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in",
                    "shadow-page hover:shadow-soft hover:-translate-y-1"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative aspect-square bg-secondary/30 overflow-hidden">
                    <div className="absolute inset-2 border border-ink/10 rounded" />

                    {item.latestItem?.thumbnail ? (
                      <img
                        src={item.latestItem.thumbnail}
                        alt={item.latestItem.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('이미지 로드 실패:', item.latestItem?.thumbnail);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ 이미지 로드 성공:', item.latestItem?.thumbnail);
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="w-12 h-12 text-ink/30" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 w-8 h-8 rounded-md bg-background/80 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gold" />
                    </div>

                    {(item.type === "document" || item.type === "file") && item.latestItem && (
                      <div className="absolute left-4 right-4 bottom-16 text-center">
                        <p className="text-lg font-serif text-ink/60 truncate">
                          {item.latestItem.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-ink/10 bg-background/10">
                    <h3 className="font-serif text-base text-ink">{item.label}</h3>
                    <p className="font-serif text-xs text-ink/50">
                      {item.latestItem ? formatDate(item.latestItem.createdAt) : "항목 없음"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {typeCards.length === 0 && !loading && (
            <div className="text-center py-20 paper-texture rounded-lg">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="font-handwriting text-xl text-muted-foreground">
                보관함이 비어있습니다
              </p>
              <p className="font-serif text-sm text-muted-foreground mt-2">
                사진이나 문서를 추가해보세요
              </p>
            </div>
          )}
        </div>

        {/* AddItemModal for file upload */}
        {selectedUploadType && (
          <AddItemModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setSelectedUploadType(null);
            }}
            itemType={selectedUploadType}
            typeLabel={getTypeLabel(selectedUploadType)}
            onAdd={handleAddItem}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default LibraryPage;