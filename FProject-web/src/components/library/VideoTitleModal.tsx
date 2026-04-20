import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface VideoTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
  defaultTitle: string;
  mode?: 'create' | 'edit'; // 생성 모드인지 수정 모드인지
  itemId?: string; // 수정 모드일 때 아이템 ID (AI 생성용)
}

export function VideoTitleModal({
  isOpen,
  onClose,
  onConfirm,
  defaultTitle,
  mode = 'create',
  itemId,
}: VideoTitleModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // AI 자동 생성
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    
    // AI 생성 중이라는 임시 제목 설정
    const tempTitle = "제목 생성 중...";
    setTitle(tempTitle);
    
    // 즉시 확인 처리 (팝업 닫기)
    onConfirm(tempTitle);
    
    // 백그라운드에서 AI 제목 생성 (팝업 닫힌 후)
    try {
      const API_BASE_URL = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.VITE_LIBRARY_API_PREFIX || "/library"}`;
      
      // itemId가 있으면 라이브러리 API 사용 (생성/수정 모드 모두)
      if (itemId) {
        // Cognito 토큰 가져오기
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        const cognitoKeys = Object.keys(localStorage).filter(key => 
          key.includes('CognitoIdentityServiceProvider') && 
          key.includes(clientId) &&
          key.endsWith('.idToken')
        );
        const token = cognitoKeys.length > 0 ? localStorage.getItem(cognitoKeys[0]) : null;

        const response = await fetch(`${API_BASE_URL}/library-items/${itemId}/generate-title`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          const generatedTitle = data.data?.generated_title || data.generated_title || defaultTitle;
          
          console.log('AI 제목 생성 완료:', {
            title: generatedTitle,
            labels: data.data?.labels,
          });
          
          // 생성된 제목은 백엔드에서 자동으로 DB에 저장됨
          // 프론트엔드에서는 별도 처리 불필요
        }
      }
    } catch (error) {
      console.error('AI 제목 생성 오류:', error);
      // 에러가 발생해도 팝업은 이미 닫혔으므로 조용히 처리
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "오류",
        description: "제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    onConfirm(title.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md paper-texture border border-ink/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-ink">
            {mode === 'edit' ? '동영상 제목 수정' : '동영상 제목 입력'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-ink/80">
              제목
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="동영상 제목을 입력하세요"
              className="bg-background"
              disabled={isGenerating}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAIGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI 자동 생성
              </>
            )}
          </Button>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
              disabled={isGenerating}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={!title.trim() || isGenerating}
            >
              확인
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
