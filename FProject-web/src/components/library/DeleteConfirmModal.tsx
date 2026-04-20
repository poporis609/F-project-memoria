import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
}: DeleteConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm paper-texture border border-ink/10">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-gold" />
          </div>
          <DialogTitle className="text-center text-xl font-serif text-ink">
            정말 삭제하시겠습니까?
          </DialogTitle>
          <DialogDescription className="text-center text-ink/70">
            선택한 {itemCount}개 항목이 영구적으로 삭제됩니다.
            <br />
            이 작업은 취소할 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
