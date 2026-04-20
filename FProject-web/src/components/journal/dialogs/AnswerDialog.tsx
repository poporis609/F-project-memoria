import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AnswerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

export const AnswerDialog = ({ isOpen, onClose, content }: AnswerDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-primary/10 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            AI 답변
          </DialogTitle>
          <DialogDescription className="pt-4 pb-2">
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                이 답변은 저장되지 않습니다.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
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