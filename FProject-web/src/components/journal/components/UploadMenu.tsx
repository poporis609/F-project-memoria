import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LibraryItemType } from "@/types/library";

interface UploadMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onUploadClick: (type: LibraryItemType) => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

export const UploadMenu = ({ isOpen, onToggle, onUploadClick, menuRef }: UploadMenuProps) => {
  return (
    <div className="relative" ref={menuRef}>
      <Button 
        size="sm"
        onClick={onToggle}
        className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        aria-label="파일 업로드"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 bottom-full mb-2 w-36 rounded-md border border-ink/10 bg-background/95 shadow-page backdrop-blur-sm z-20"
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm font-serif text-sepia hover:bg-gold/10 hover:text-gold transition-colors"
            onClick={() => onUploadClick("image")}
          >
            사진
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm font-serif text-sepia hover:bg-gold/10 hover:text-gold transition-colors"
            onClick={() => onUploadClick("video")}
          >
            동영상
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm font-serif text-sepia hover:bg-gold/10 hover:text-gold transition-colors"
            onClick={() => onUploadClick("document")}
          >
            문서
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm font-serif text-sepia hover:bg-gold/10 hover:text-gold transition-colors"
            onClick={() => onUploadClick("file")}
          >
            파일
          </button>
        </div>
      )}
    </div>
  );
};