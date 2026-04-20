import { HelpCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface OverwriteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingHistoryDate: string | null;
}

export const OverwriteDialog = ({ isOpen, onClose, onConfirm, existingHistoryDate }: OverwriteDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-primary/10 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <HelpCircle className="w-5 h-5" />
            히스토리 덮어쓰기
          </DialogTitle>
          <DialogDescription className="pt-2">
            {existingHistoryDate && (
              <>
                <span className="font-semibold text-foreground">
                  {new Date(existingHistoryDate).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
                에 이미 저장된 히스토리가 있습니다.
                <br/><br/>
                기존 내용을 덮어쓰시겠습니까?
                <br/>
                <span className="text-amber-600 text-sm">덮어쓴 내용은 복구할 수 없습니다.</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            variant="default" 
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            네, 덮어쓸래요
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SavingDialogProps {
  isOpen: boolean;
}

export const SavingDialog = ({ isOpen }: SavingDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-primary/10 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            히스토리 등록 중
          </DialogTitle>
        </DialogHeader>
        <div className="pt-4 pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <Sparkles className="w-4 h-4 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-50 animate-pulse" />
            </div>
            <p className="text-center text-base text-foreground font-medium">
              히스토리에 등록하고 있습니다...
            </p>
            <p className="text-center text-sm text-muted-foreground">
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessDialog = ({ isOpen, onClose }: SuccessDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-primary/10 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Sparkles className="w-5 h-5" />
            저장 완료
          </DialogTitle>
        </DialogHeader>
        <div className="pt-4 pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-95 duration-300">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-center text-base text-foreground font-medium">
              히스토리에 성공적으로 등록되었습니다!
            </p>
            <p className="text-center text-sm text-muted-foreground">
              오늘의 소중한 기록이 저장되었어요.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button 
            variant="default" 
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};