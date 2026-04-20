import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const ErrorDialog = ({ isOpen, onClose, message }: ErrorDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-red-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <X className="w-5 h-5" />
            오류 발생
          </DialogTitle>
          <DialogDescription className="pt-4 pb-2">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-in zoom-in-95 duration-300">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-center text-base text-foreground font-medium">
                {message}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                잠시 후 다시 시도해주세요.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button 
            variant="default" 
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};