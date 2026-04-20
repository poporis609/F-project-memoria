import { useState } from "react";
import { X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalEntry as JournalEntryType } from "../services/journalApi";

interface JournalEntryProps {
  entry: JournalEntryType;
  index: number;
  onUpdate: (entryId: string, content: string) => void;
  onDelete: (entryId: string) => void;
}

export const JournalEntry = ({ entry, index, onUpdate, onDelete }: JournalEntryProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);

  const handleSave = () => {
    if (editContent.trim() && editContent !== entry.content) {
      onUpdate(entry.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(entry.content);
    setIsEditing(false);
  };

  return (
    <div 
      key={entry.id}
      className="group flex items-start gap-3 p-4 rounded-lg bg-[#ebe5da] shadow-sm border border-[#dcd6cc] animate-in fade-in slide-in-from-left-2 duration-300 border-l-4 border-l-primary relative"
    >
      <span className="text-xs text-stone-500 font-mono mt-1 font-medium shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full text-stone-800 text-sm leading-relaxed font-medium whitespace-pre-wrap break-all bg-white border border-stone-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={3}
            autoFocus
          />
        ) : (
          <p className="text-stone-800 text-sm leading-relaxed font-medium whitespace-pre-wrap break-all">
            {entry.content}
          </p>
        )}
        <p className="text-xs text-stone-400 mt-1">
          {entry.created_at.toLocaleString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </p>
      </div>
      
      <div className="flex gap-1 shrink-0">
        {isEditing ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSave}
              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
              aria-label="수정 완료"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCancel}
              className="h-6 w-6 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="수정 취소"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 text-stone-400 hover:text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="이 기록 수정"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(entry.id)}
              className="h-6 w-6 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="이 기록 삭제"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};