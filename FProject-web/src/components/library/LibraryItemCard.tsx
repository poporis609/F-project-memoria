import { useState, useRef } from "react";
import { Check, File, FileText, Image, Video, Edit2 } from "lucide-react";
import { LibraryItem } from "@/types/library";
import { cn } from "@/lib/utils";

const iconMap = {
  image: Image,
  document: FileText,
  file: File,
  video: Video,
};

interface LibraryItemCardProps {
  item: LibraryItem;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpen?: (item: LibraryItem) => void;
  onEditTitle?: (id: string, currentTitle: string) => void;
}

export function LibraryItemCard({
  item,
  isSelectionMode,
  isSelected,
  onSelect,
  onOpen,
  onEditTitle,
}: LibraryItemCardProps) {
  const IconComponent = iconMap[item.type];
  
  // 호버 상태 및 비디오 ref
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 호버 핸들러
  const handleMouseEnter = () => {
    setIsHovered(true);
    const videoUrl = item.previewUrl || item.fileUrl;
    console.log('🎬 호버 시작:', {
      type: item.type,
      previewUrl: item.previewUrl,
      fileUrl: item.fileUrl,
      usingUrl: videoUrl,
      hasVideoRef: !!videoRef.current
    });
    // videoRef는 비디오 엘리먼트가 마운트된 후에 설정되므로
    // onLoadedData에서 재생 시도
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    console.log('🎬 호버 종료');
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // 제목 수정 핸들러 - 부모 컴포넌트로 전달만
  const handleEditTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditTitle?.(item.id, item.name);
  };

  return (
    <div
      className={cn(
        "group relative cursor-pointer paper-texture rounded-lg overflow-hidden transition-all duration-300 animate-fade-in",
        isSelected ? "ring-2 ring-gold shadow-book" : "shadow-page hover:shadow-soft hover:-translate-y-1"
      )}
      onClick={() => {
        if (isSelectionMode) {
          onSelect(item.id);
          return;
        }
        // 선택 모드가 아닐 때는 상세 미리보기로 진입.
        onOpen?.(item);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isSelectionMode && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all border",
              isSelected
                ? "bg-gold text-background border-gold"
                : "bg-background/80 border-ink/20"
            )}
          >
            {isSelected ? <Check className="w-4 h-4" /> : null}
          </div>
        </div>
      )}

      <div className="relative aspect-[4/3] bg-secondary/30 overflow-hidden">
        {/* 동영상이고 프리뷰 URL이 있으면 호버 시 비디오 재생 */}
        {item.type === "video" && (item.previewUrl || item.fileUrl) && isHovered ? (
          <video
            ref={videoRef}
            src={item.previewUrl || item.fileUrl}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            crossOrigin="anonymous"
            onLoadedData={() => {
              console.log('✅ 비디오 로드 완료:', item.previewUrl || item.fileUrl);
              // 로드 완료 후 재생 시도
              if (videoRef.current) {
                videoRef.current.play().catch((error) => {
                  console.error('❌ 자동 재생 실패:', error);
                });
              }
            }}
            onError={(e) => {
              console.error('❌ 비디오 로드 실패:', item.previewUrl || item.fileUrl, e);
            }}
          />
        ) : item.type === "document" ? (
          // 문서 타입: 고정 썸네일
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <FileText className="w-16 h-16 text-blue-600 mb-2" />
            <span className="text-xs text-blue-700 font-serif">문서</span>
          </div>
        ) : item.type === "file" ? (
          // 파일 타입: 고정 썸네일
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <File className="w-16 h-16 text-gray-600 mb-2" />
            <span className="text-xs text-gray-700 font-serif">파일</span>
          </div>
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            crossOrigin="anonymous"
            onError={(e) => {
              console.error('카드 이미지 로드 실패:', item.thumbnail);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log('✅ 카드 이미지 로드 성공:', item.thumbnail);
            }}
          />
        ) : (
          // 썸네일이 없으면 타입에 따라 처리 중 표시 (이미지/동영상만)
          <div className="w-full h-full flex flex-col items-center justify-center">
            <IconComponent className="w-10 h-10 text-ink/30 animate-pulse" />
            <span className="text-xs text-ink/50 mt-2">
              {item.type === "video" ? "썸네일 생성 중..." : 
               item.type === "image" ? "이미지 처리 중..." : 
               "파일 처리 중..."}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-ink/10 bg-background/10">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-sm text-ink truncate flex-1">{item.name}</h3>
          {!isSelectionMode && item.type === "video" && (
            <button
              onClick={handleEditTitle}
              className="p-1 hover:bg-gold/10 rounded transition-colors"
              title="제목 수정"
            >
              <Edit2 className="w-3.5 h-3.5 text-ink/60 hover:text-gold" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="font-serif text-xs text-ink/50">{formatDate(item.createdAt)}</p>
          {item.size && (
            <p className="font-serif text-xs text-ink/50">{formatFileSize(item.size)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
