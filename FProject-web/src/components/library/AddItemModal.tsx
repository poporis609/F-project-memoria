import { useState, useRef } from "react";
import { Plus, Upload, X, FileIcon, ImageIcon, VideoIcon, FileTextIcon } from "lucide-react";
import { LibraryItemType } from "@/types/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { VideoTitleModal } from "./VideoTitleModal";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: LibraryItemType;
  typeLabel: string;
  onAdd: (item: any) => void;
}

export function AddItemModal({
  isOpen,
  onClose,
  itemType,
  typeLabel,
  onAdd,
}: AddItemModalProps) {
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [uploadedItemId, setUploadedItemId] = useState<string | null>(null);
  const [uploadedItem, setUploadedItem] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 파일 타입별 아이콘
  const getFileIcon = (type: LibraryItemType) => {
    switch (type) {
      case "image": return <ImageIcon className="w-5 h-5" />;
      case "video": return <VideoIcon className="w-5 h-5" />;
      case "document": return <FileTextIcon className="w-5 h-5" />;
      default: return <FileIcon className="w-5 h-5" />;
    }
  };

  // 파일 타입별 허용 확장자
  const getAcceptedTypes = (type: LibraryItemType): string => {
    switch (type) {
      case "image":
        return "image/*";
      case "video":
        return "video/*";
      case "document":
        return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf";
      default:
        return "*/*";
    }
  };

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!name) {
        // 파일명에서 확장자 제거하여 기본 이름 설정
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setName(nameWithoutExt);
      }
    }
  };

  // 파일 제거
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // 폼 제출 처리
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "오류",
        description: "업로드할 파일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 동영상인 경우 먼저 업로드 후 제목 입력 모달 표시
    if (itemType === "video") {
      await performUploadWithoutTitle();
      return;
    }

    // 동영상이 아닌 경우 기존 로직
    if (!name.trim()) {
      toast({
        title: "오류",
        description: "파일 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    await performUpload(name.trim());
  };

  // 동영상 업로드 (제목 없이)
  const performUploadWithoutTitle = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 파일명 그대로 임시 제목으로 사용
      const tempTitle = selectedFile.name;
      
      // API 서비스를 통해 파일 업로드
      const uploadedItem = await apiService.uploadFile(
        selectedFile,
        tempTitle,
        "private",
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // 업로드된 아이템 정보 저장
      setUploadedItemId(uploadedItem.id);
      setUploadedItem(uploadedItem);
      setName(selectedFile.name.replace(/\.[^/.]+$/, "")); // 확장자 제거한 이름을 기본값으로
      
      toast({
        title: "업로드 완료",
        description: "동영상 제목을 입력해주세요.",
      });

      // 제목 입력 모달 열기
      setIsTitleModalOpen(true);
    } catch (error) {
      console.error("업로드 실패:", error);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 실제 업로드 수행 (동영상 아닌 경우)
  const performUpload = async (finalTitle: string) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // API 서비스를 통해 파일 업로드
      const uploadedItem = await apiService.uploadFile(
        selectedFile,
        finalTitle,
        "private",
        (progress) => {
          setUploadProgress(progress);
        }
      );

      toast({
        title: "업로드 완료",
        description: `${finalTitle}이(가) 성공적으로 업로드되었습니다.`,
      });

      // 부모 컴포넌트에 새 아이템 전달
      onAdd(uploadedItem);
      
      // 폼 초기화
      resetForm();
      onClose();
    } catch (error) {
      console.error("업로드 실패:", error);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 동영상 제목 확인 후 제목 업데이트
  const handleTitleConfirm = async (title: string) => {
    if (!uploadedItemId || !uploadedItem) return;

    try {
      // 제목 업데이트 API 호출
      await apiService.updateLibraryItem(uploadedItemId, { name: title });
      
      toast({
        title: "제목 저장 완료",
        description: `${title}이(가) 저장되었습니다.`,
      });

      // 업데이트된 아이템 정보로 부모에 전달
      onAdd({ ...uploadedItem, name: title });
      
      // 폼 초기화
      resetForm();
      setIsTitleModalOpen(false);
      onClose();
    } catch (error) {
      console.error("제목 저장 실패:", error);
      toast({
        title: "저장 실패",
        description: "제목 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setName("");
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadedItemId(null);
    setUploadedItem(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 모달 닫기 처리
  const handleClose = () => {
    if (isUploading) {
      toast({
        title: "업로드 중",
        description: "파일 업로드가 진행 중입니다. 잠시만 기다려주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // 제목 입력 모달이 열려있으면 닫지 않음
    if (isTitleModalOpen) {
      return;
    }
    
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md paper-texture border border-ink/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif flex items-center gap-2 text-ink">
            <Plus className="w-5 h-5 text-gold" />
            새 {typeLabel} 추가
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 파일 선택 영역 */}
          <div className="space-y-2">
            <Label className="text-ink/80">파일 선택</Label>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-ink/20 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptedTypes(itemType)}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center gap-2">
                  {getFileIcon(itemType)}
                  <p className="text-sm text-ink/60">
                    클릭하여 {typeLabel} 파일을 선택하세요
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    파일 선택
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border border-ink/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(itemType)}
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-ink/60">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 파일 이름 입력 - 동영상이 아닐 때만 표시 */}
          {itemType !== "video" && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-ink/80">
                표시 이름
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={`${typeLabel} 이름을 입력하세요`}
                className="bg-background"
                disabled={isUploading}
              />
            </div>
          )}

          {/* 업로드 진행률 */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink/80">업로드 진행률</span>
                <span className="text-ink/80">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={handleClose}
              disabled={isUploading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={(!name.trim() && itemType !== "video") || !selectedFile || isUploading}
            >
              {isUploading ? "업로드 중..." : itemType === "video" ? "업로드" : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* 동영상 제목 입력 모달 */}
      <VideoTitleModal
        isOpen={isTitleModalOpen}
        onClose={() => {
          setIsTitleModalOpen(false);
          // 제목 입력 취소 시 업로드된 아이템 삭제 (선택사항)
          // 또는 임시 제목으로 그대로 두기
        }}
        onConfirm={handleTitleConfirm}
        defaultTitle={name}
        mode="create"
        itemId={uploadedItemId || undefined}
      />
    </Dialog>
  );
}